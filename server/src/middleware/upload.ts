import multer from 'multer';
import { NextFunction, Request, RequestHandler, Response } from 'express';
import { S3_CONFIG } from '../config/s3';

// Configure multer for memory storage (we'll upload directly to S3)
const storage = multer.memoryStorage();

// File filter to validate file types
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (S3_CONFIG.allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${S3_CONFIG.allowedMimeTypes.join(', ')}`));
  }
};

const hasMagic = (buffer: Buffer, signature: number[], offset = 0) =>
  signature.every((byte, index) => buffer[offset + index] === byte);

const isLikelyCsv = (buffer: Buffer) => {
  const sample = buffer.subarray(0, Math.min(buffer.length, 4096)).toString('utf8');
  return sample.length > 0 && /^[\u0009\u000a\u000d\u0020-\u007e]+$/.test(sample) && sample.includes(',');
};

const sniffMimeType = (buffer: Buffer): string | null => {
  if (buffer.length < 4) return null;
  if (hasMagic(buffer, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (hasMagic(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (hasMagic(buffer, [0x47, 0x49, 0x46, 0x38])) return 'image/gif';
  if (hasMagic(buffer, [0x52, 0x49, 0x46, 0x46]) && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  if (buffer.subarray(0, 5).toString('ascii') === '%PDF-') return 'application/pdf';
  if (hasMagic(buffer, [0x50, 0x4b, 0x03, 0x04])) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (isLikelyCsv(buffer)) return 'text/csv';
  return null;
};

const compatibleMimeTypes = (declared: string, detected: string) => {
  if (declared === detected) return true;
  if (declared === 'image/jpg' && detected === 'image/jpeg') return true;
  if (declared === 'application/vnd.ms-excel' && detected === 'text/csv') return true;
  return false;
};

const stripJpegMetadata = (buffer: Buffer) => {
  if (!hasMagic(buffer, [0xff, 0xd8])) return buffer;

  const chunks = [buffer.subarray(0, 2)];
  let offset = 2;
  while (offset + 4 <= buffer.length) {
    if (buffer[offset] !== 0xff) break;
    const marker = buffer[offset + 1];
    if (marker === 0xda) {
      chunks.push(buffer.subarray(offset));
      return Buffer.concat(chunks);
    }

    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2 || offset + 2 + length > buffer.length) break;

    const shouldStrip = (marker >= 0xe0 && marker <= 0xef) || marker === 0xfe;
    if (!shouldStrip) {
      chunks.push(buffer.subarray(offset, offset + 2 + length));
    }
    offset += 2 + length;
  }

  return buffer;
};

const stripPngMetadata = (buffer: Buffer) => {
  if (!hasMagic(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return buffer;

  const chunks = [buffer.subarray(0, 8)];
  let offset = 8;
  const stripTypes = new Set(['tEXt', 'zTXt', 'iTXt', 'eXIf']);

  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    const chunkEnd = offset + 12 + length;
    if (chunkEnd > buffer.length) return buffer;

    if (!stripTypes.has(type)) {
      chunks.push(buffer.subarray(offset, chunkEnd));
    }

    offset = chunkEnd;
    if (type === 'IEND') break;
  }

  return Buffer.concat(chunks);
};

const stripWebpMetadata = (buffer: Buffer) => {
  if (!(hasMagic(buffer, [0x52, 0x49, 0x46, 0x46]) && buffer.subarray(8, 12).toString('ascii') === 'WEBP')) {
    return buffer;
  }

  const chunks: Buffer[] = [];
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const type = buffer.subarray(offset, offset + 4).toString('ascii');
    const size = buffer.readUInt32LE(offset + 4);
    const paddedSize = size + (size % 2);
    const end = offset + 8 + paddedSize;
    if (end > buffer.length) return buffer;
    if (type !== 'EXIF' && type !== 'XMP ') {
      chunks.push(buffer.subarray(offset, end));
    }
    offset = end;
  }

  const payload = Buffer.concat(chunks);
  const header = Buffer.alloc(12);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(payload.length + 4, 4);
  header.write('WEBP', 8, 'ascii');
  return Buffer.concat([header, payload]);
};

const stripImageMetadata = (file: Express.Multer.File) => {
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg') {
    file.buffer = stripJpegMetadata(file.buffer);
    file.mimetype = 'image/jpeg';
  } else if (file.mimetype === 'image/png') {
    file.buffer = stripPngMetadata(file.buffer);
  } else if (file.mimetype === 'image/webp') {
    file.buffer = stripWebpMetadata(file.buffer);
  }
};

const validateUploadedFiles: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const files = req.file ? [req.file] : Array.isArray(req.files) ? req.files : [];

  for (const file of files) {
    const detectedMimeType = sniffMimeType(file.buffer);
    if (!detectedMimeType || !compatibleMimeTypes(file.mimetype, detectedMimeType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file content',
      });
    }

    stripImageMetadata(file);
  }

  next();
};

// Create multer upload middleware
export const upload = multer({
  storage,
  limits: {
    fileSize: S3_CONFIG.maxFileSize,
  },
  fileFilter,
});

// Single file upload middleware
export const uploadSingle = [upload.single('file'), validateUploadedFiles];

// Multiple files upload middleware (max 10 files)
export const uploadMultiple = [upload.array('files', 10), validateUploadedFiles];

import multer from 'multer';
import { Request } from 'express';
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

// Create multer upload middleware
export const upload = multer({
  storage,
  limits: {
    fileSize: S3_CONFIG.maxFileSize,
  },
  fileFilter,
});

// Single file upload middleware
export const uploadSingle = upload.single('file');

// Multiple files upload middleware (max 10 files)
export const uploadMultiple = upload.array('files', 10);

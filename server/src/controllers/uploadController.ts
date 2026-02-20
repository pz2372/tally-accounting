import { Response } from 'express';
import { AuthenticatedRequest } from '../types/http';
import { uploadToS3, deleteFromS3, extractS3Key } from '../services/s3Service';

type Handler = (req: AuthenticatedRequest, res: Response) => Promise<Response | void> | Response | void;

/**
 * Upload a single file to S3
 * POST /api/upload
 * Body: multipart/form-data with 'file' field
 * Query params: ?folder=receipts (optional)
 */
export const uploadFile: Handler = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided',
      });
    }

    const { orgId } = req.user;
    if (!orgId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required',
      });
    }

    // Get folder from query params or default to 'uploads'
    const folder = (req.query.folder as string) || 'uploads';

    // Upload to S3
    const result = await uploadToS3(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      `${orgId}/${folder}` // Organize by org
    );

    return res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        url: result.url,
        key: result.key,
        bucket: result.bucket,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

/**
 * Upload multiple files to S3
 * POST /api/upload/multiple
 * Body: multipart/form-data with 'files' field
 * Query params: ?folder=receipts (optional)
 */
export const uploadMultipleFiles: Handler = async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files provided',
      });
    }

    const { orgId } = req.user;
    if (!orgId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required',
      });
    }

    // Get folder from query params or default to 'uploads'
    const folder = (req.query.folder as string) || 'uploads';

    // Upload all files
    const uploadPromises = files.map((file) =>
      uploadToS3(
        file.buffer,
        file.originalname,
        file.mimetype,
        `${orgId}/${folder}`
      ).then((result) => ({
        url: result.url,
        key: result.key,
        bucket: result.bucket,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      }))
    );

    const results = await Promise.all(uploadPromises);

    return res.status(200).json({
      success: true,
      message: `${results.length} file(s) uploaded successfully`,
      data: results,
    });
  } catch (error) {
    console.error('Multiple upload error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

/**
 * Delete a file from S3
 * DELETE /api/upload/:key
 * URL encoded key parameter
 */
export const deleteFile: Handler = async (req, res) => {
  try {
    const { key } = req.params;
    
    if (!key) {
      return res.status(400).json({
        success: false,
        error: 'File key is required',
      });
    }

    const { orgId } = req.user;
    if (!orgId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required',
      });
    }

    // Verify the file belongs to the user's org
    const decodedKey = decodeURIComponent(key);
    if (!decodedKey.startsWith(`${orgId}/`)) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to delete this file',
      });
    }

    // Delete from S3
    await deleteFromS3(decodedKey);

    return res.status(200).json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    console.error('Delete error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

/**
 * Delete a file by its URL
 * DELETE /api/upload/by-url
 * Body: { url: string }
 */
export const deleteFileByUrl: Handler = async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'File URL is required',
      });
    }

    const { orgId } = req.user;
    if (!orgId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required',
      });
    }

    // Extract key from URL
    const key = extractS3Key(url);
    if (!key) {
      return res.status(400).json({
        success: false,
        error: 'Invalid S3 URL',
      });
    }

    // Verify the file belongs to the user's org
    if (!key.startsWith(`${orgId}/`)) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to delete this file',
      });
    }

    // Delete from S3
    await deleteFromS3(key);

    return res.status(200).json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    console.error('Delete by URL error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

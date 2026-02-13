import { Router } from 'express';
import { uploadFile, uploadMultipleFiles, deleteFile, deleteFileByUrl } from '../controllers/uploadController';
import { uploadSingle, uploadMultiple } from '../middleware/upload';
import { verifyToken, requireOrg } from '../middleware/auth';

const router = Router();

// All upload routes require authentication and organization context
router.use(verifyToken);
router.use(requireOrg);

// Upload single file
router.post('/', uploadSingle, uploadFile);

// Upload multiple files
router.post('/multiple', uploadMultiple, uploadMultipleFiles);

// Delete file by key
router.delete('/:key', deleteFile);

// Delete file by URL
router.delete('/by-url', deleteFileByUrl);

export default router;

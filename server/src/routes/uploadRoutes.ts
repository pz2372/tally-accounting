import { Router } from 'express';
import { uploadFile, uploadMultipleFiles, deleteFile, deleteFileByUrl } from '../controllers/uploadController';
import { uploadSingle, uploadMultiple } from '../middleware/upload';
import { verifyToken, requireOrg } from '../middleware/auth';
import { auditAction } from '../middleware/auditAction';
import { uploadLimiter } from '../middleware/rateLimits';
import { validate } from '../middleware/validate';
import { uploadKeyParam, uploadSchemas } from '../validation/schemas';

const router = Router();

// All upload routes require authentication and organization context
router.use(verifyToken);
router.use(requireOrg);

// Upload single file
router.post('/', uploadLimiter, validate({ query: uploadSchemas.folderQuery }), uploadSingle, uploadFile);

// Upload multiple files
router.post('/multiple', uploadLimiter, validate({ query: uploadSchemas.folderQuery }), uploadMultiple, uploadMultipleFiles);

// Delete file by URL
router.delete('/by-url', validate({ body: uploadSchemas.deleteByUrl }), auditAction({ action: 'DELETE', entityType: 'UploadedFile', entityId: req => String(req.body.url || 'url') }), deleteFileByUrl);

// Delete file by key
router.delete('/:key', validate({ params: uploadKeyParam }), auditAction({ action: 'DELETE', entityType: 'UploadedFile', entityId: req => req.params.key }), deleteFile);

export default router;

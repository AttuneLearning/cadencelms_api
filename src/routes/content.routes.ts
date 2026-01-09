import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { authenticate } from '@/middlewares/authenticate';
import * as contentController from '@/controllers/content/content.controller';

const router = Router();

/**
 * Content Routes
 * Base path: /api/v2/content
 *
 * All routes require authentication
 * File upload routes use multer middleware
 */

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    // Determine upload directory based on field name
    if (file.fieldname === 'thumbnail') {
      cb(null, 'uploads/thumbnails/');
    } else if (file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/')) {
      cb(null, 'uploads/media/');
    } else if (file.originalname.endsWith('.zip')) {
      cb(null, 'uploads/scorm/');
    } else {
      cb(null, 'uploads/media/');
    }
  },
  filename: (_req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB max (handled per-type in service)
  }
});

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * =====================
 * SCORM PACKAGE ROUTES
 * Base: /api/v2/content/scorm
 * =====================
 * Note: SCORM routes must come BEFORE the generic /:id route
 * to prevent 'scorm' from being treated as an ID
 */

/**
 * GET /api/v2/content/scorm
 * List SCORM packages
 * Permissions: read:content
 */
router.get('/scorm', contentController.listScorm);

/**
 * POST /api/v2/content/scorm
 * Upload SCORM package
 * Permissions: write:content
 * Content-Type: multipart/form-data
 */
router.post(
  '/scorm',
  upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ]),
  contentController.uploadScorm
);

/**
 * GET /api/v2/content/scorm/:id
 * Get SCORM package details
 * Permissions: read:content
 */
router.get('/scorm/:id', contentController.getScorm);

/**
 * PUT /api/v2/content/scorm/:id
 * Update SCORM package metadata
 * Permissions: write:content
 */
router.put('/scorm/:id', contentController.updateScorm);

/**
 * DELETE /api/v2/content/scorm/:id
 * Delete SCORM package
 * Permissions: write:content, delete:content
 */
router.delete('/scorm/:id', contentController.deleteScorm);

/**
 * POST /api/v2/content/scorm/:id/launch
 * Launch SCORM player
 * Permissions: read:content
 */
router.post('/scorm/:id/launch', contentController.launchScorm);

/**
 * POST /api/v2/content/scorm/:id/publish
 * Publish SCORM package
 * Permissions: publish:content
 */
router.post('/scorm/:id/publish', contentController.publishScorm);

/**
 * POST /api/v2/content/scorm/:id/unpublish
 * Unpublish SCORM package
 * Permissions: publish:content
 */
router.post('/scorm/:id/unpublish', contentController.unpublishScorm);

/**
 * =====================
 * MEDIA LIBRARY ROUTES
 * Base: /api/v2/content/media
 * =====================
 */

/**
 * GET /api/v2/content/media
 * List media files
 * Permissions: read:content
 */
router.get('/media', contentController.listMedia);

/**
 * POST /api/v2/content/media
 * Upload media file
 * Permissions: write:content
 * Content-Type: multipart/form-data
 */
router.post('/media', upload.single('file'), contentController.uploadMedia);

/**
 * GET /api/v2/content/media/:id
 * Get media file details
 * Permissions: read:content
 */
router.get('/media/:id', contentController.getMedia);

/**
 * PUT /api/v2/content/media/:id
 * Update media metadata
 * Permissions: write:content
 */
router.put('/media/:id', contentController.updateMedia);

/**
 * DELETE /api/v2/content/media/:id
 * Delete media file
 * Permissions: write:content, delete:content
 */
router.delete('/media/:id', contentController.deleteMedia);

/**
 * =====================
 * CONTENT OVERVIEW ROUTES
 * Base: /api/v2/content
 * =====================
 * Note: These generic routes must come LAST to avoid
 * catching specific routes like /scorm and /media
 */

/**
 * GET /api/v2/content
 * List all content items
 * Permissions: read:content
 */
router.get('/', contentController.listContent);

/**
 * GET /api/v2/content/:id
 * Get content item details
 * Permissions: read:content
 */
router.get('/:id', contentController.getContent);

export default router;

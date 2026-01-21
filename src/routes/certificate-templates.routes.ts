import { Router } from 'express';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
import { requireAccessRight } from '@/middlewares/requireAccessRight';
import * as certificateTemplatesController from '@/controllers/content/certificate-templates.controller';

const router = Router();

/**
 * Certificate Templates Routes
 * Base path: /api/v2/certificate-templates
 *
 * All routes require authentication
 */

// Apply authentication middleware to all routes
router.use(isAuthenticated);

/**
 * GET /api/v2/certificate-templates
 * List certificate templates for program certificates
 * Access Right: content:programs:manage
 * Query params: scope (system/organization/department), departmentId
 */
router.get(
  '/',
  requireAccessRight('content:programs:manage'),
  certificateTemplatesController.listCertificateTemplates
);

export default router;

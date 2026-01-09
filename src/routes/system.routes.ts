import { Router } from 'express';
import {
  getHealth,
  getStatus,
  getMetrics,
  getVersion,
  getStats,
  toggleMaintenance
} from '@/controllers/system/system.controller';
import { authenticate, authorize } from '@/middlewares/authenticate';

const router = Router();

/**
 * System Health and Monitoring Routes
 * Base path: /api/v2/system
 */

// PUBLIC endpoints (no authentication required)
router.get('/health', getHealth);
router.get('/version', getVersion);

// ADMIN-ONLY endpoints
router.get('/status', authenticate, authorize('system-admin', 'global-admin'), getStatus);
router.get('/metrics', authenticate, authorize('system-admin', 'global-admin'), getMetrics);
router.get('/stats', authenticate, authorize('system-admin', 'global-admin'), getStats);
router.post('/maintenance', authenticate, authorize('system-admin', 'global-admin'), toggleMaintenance);

export default router;

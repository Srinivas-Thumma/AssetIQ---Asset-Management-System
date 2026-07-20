import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/rbac.middleware.js';
import {
  getOrganizations,
  updateOrganizationStatus,
  getPlatformAnalytics
} from '../controllers/admin.controller.js';

const router = express.Router();

// Apply auth globally to this router (Admin operations bypass tenantScope middleware to execute unscoped queries)
router.use(protect);
router.use(requireRole('super_admin'));

router.get('/organizations', getOrganizations);
router.put('/organizations/:id', updateOrganizationStatus);
router.get('/analytics', getPlatformAnalytics);

export default router;

import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { tenantScope } from '../middlewares/tenant.middleware.js';
import { requireRole } from '../middlewares/rbac.middleware.js';
import {
  getMaintenanceRequests,
  createMaintenanceRequest,
  updateMaintenanceRequest,
  deleteMaintenanceRequest,
  completeMaintenance
} from '../controllers/maintenance.controller.js';

const router = express.Router();

// Apply auth and tenant scoping globally to maintenance routes
router.use(protect);
router.use(tenantScope);

router.route('/')
  .get(getMaintenanceRequests)
  // Any authenticated tenant user can raise a request (e.g., employee reporting damage)
  .post(createMaintenanceRequest);

router.route('/:id')
  .put(requireRole('org_admin', 'super_admin', 'asset_manager'), updateMaintenanceRequest)
  .delete(requireRole('org_admin', 'super_admin', 'asset_manager'), deleteMaintenanceRequest);

router.post('/:id/complete', requireRole('org_admin', 'super_admin', 'asset_manager'), completeMaintenance);

export default router;

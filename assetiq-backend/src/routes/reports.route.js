import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { tenantScope } from '../middlewares/tenant.middleware.js';
import { requireRole } from '../middlewares/rbac.middleware.js';
import {
  getAssetSummaryReport,
  getMaintenanceCostReport,
  getLocationReport
} from '../controllers/reports.controller.js';

const router = express.Router();

// Apply auth and tenant scoping globally to reports routes
router.use(protect);
router.use(tenantScope);

router.get('/asset-summary', getAssetSummaryReport);

// Limit report access to managers/admins
router.use(requireRole('org_admin', 'super_admin', 'asset_manager'));

router.get('/maintenance-cost', getMaintenanceCostReport);
router.get('/location-wise', getLocationReport);

export default router;

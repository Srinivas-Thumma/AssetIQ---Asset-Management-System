import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { tenantScope } from '../middlewares/tenant.middleware.js';
import { requireRole } from '../middlewares/rbac.middleware.js';
import {
  getWarranties,
  createWarranty,
  getExpiringWarranties
} from '../controllers/warranty.controller.js';

const router = express.Router();

// Apply auth and tenant scoping globally to warranty routes
router.use(protect);
router.use(tenantScope);

router.get('/expiring', getExpiringWarranties);

router.route('/')
  .get(getWarranties)
  .post(requireRole('org_admin', 'super_admin', 'asset_manager'), createWarranty);

export default router;

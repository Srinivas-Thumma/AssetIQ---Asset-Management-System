import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { tenantScope } from '../middlewares/tenant.middleware.js';
import { requireRole } from '../middlewares/rbac.middleware.js';
import {
  getAssets,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset,
  assignAsset,
  returnAsset,
  getAssetHistory
} from '../controllers/asset.controller.js';

const router = express.Router();

// Apply auth and tenant scoping globally to these asset routes
router.use(protect);
router.use(tenantScope);

// Assets CRUD
router.route('/')
  .get(getAssets)
  .post(requireRole('org_admin', 'super_admin', 'asset_manager'), createAsset);

router.route('/:id')
  .get(getAssetById)
  .put(requireRole('org_admin', 'super_admin', 'asset_manager'), updateAsset)
  .delete(requireRole('org_admin', 'super_admin'), deleteAsset);

// Assign & Return
router.post('/:id/assign', requireRole('org_admin', 'super_admin', 'asset_manager'), assignAsset);
router.post('/:id/return', requireRole('org_admin', 'super_admin', 'asset_manager'), returnAsset);

// History logs
router.get('/:id/history', getAssetHistory);

export default router;

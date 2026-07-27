import express from 'express';
import { createAssetRequest, getAssetRequests, approveAssetRequest, rejectAssetRequest } from '../controllers/assetRequest.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { tenantScope } from '../middlewares/tenant.middleware.js';

const router = express.Router();
router.use(protect);
router.use(tenantScope);

router.post('/', createAssetRequest);
router.get('/', getAssetRequests);
router.patch('/:id/approve', approveAssetRequest);
router.patch('/:id/reject', rejectAssetRequest);

export default router;

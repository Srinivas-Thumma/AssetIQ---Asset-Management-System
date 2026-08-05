import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { tenantScope } from '../middlewares/tenant.middleware.js';
import { requireRole } from '../middlewares/rbac.middleware.js';
import {
  recomputeHealthScore,
  getHealthScoreStatus,
  summarizeTicket,
  getTriageSuggestion,
} from '../controllers/ai.controller.js';

const router = express.Router();

// Apply auth and tenant scoping globally to AI routes
router.use(protect);
router.use(tenantScope);

router.post('/recompute/:assetId', requireRole('org_admin', 'super_admin', 'asset_manager'), recomputeHealthScore);
router.get('/status/:assetId', getHealthScoreStatus);
router.post('/summarize-ticket/:requestId', summarizeTicket);
router.post('/triage-suggestion', getTriageSuggestion);

export default router;

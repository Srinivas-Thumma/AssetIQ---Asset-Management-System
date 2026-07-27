import express from 'express';
import { getOffboardingChecklist, returnAllAssets } from '../controllers/offboarding.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { tenantScope } from '../middlewares/tenant.middleware.js';

const router = express.Router();
router.use(protect);
router.use(tenantScope);

router.get('/:employeeId', getOffboardingChecklist);
router.post('/:employeeId/return-all', returnAllAssets);

export default router;

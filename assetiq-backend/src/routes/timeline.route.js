import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { tenantScope } from '../middlewares/tenant.middleware.js';
import { getAssetTimelineById, getTicketTimelineById } from '../controllers/timeline.controller.js';

const router = express.Router();

router.use(protect);
router.use(tenantScope);

router.get('/asset/:id', getAssetTimelineById);
router.get('/ticket/:id', getTicketTimelineById);

export default router;

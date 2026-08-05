import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { tenantScope } from '../middlewares/tenant.middleware.js';
import { requireRole } from '../middlewares/rbac.middleware.js';
import {
  getApprovalRequests,
  requestTicketApproval,
  handleApprovalDecision,
} from '../controllers/approval.controller.js';

const router = express.Router();

router.use(protect);
router.use(tenantScope);

router.route('/')
  .get(getApprovalRequests)
  .post(requireRole('org_admin', 'super_admin', 'asset_manager'), requestTicketApproval);

router.post('/:id/decide', requireRole('org_admin', 'super_admin'), handleApprovalDecision);

export default router;

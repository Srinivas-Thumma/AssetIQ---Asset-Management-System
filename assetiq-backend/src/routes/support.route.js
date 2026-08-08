import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { tenantScope } from '../middlewares/tenant.middleware.js';
import { requireRole } from '../middlewares/rbac.middleware.js';
import {
  createSupportTicket,
  getMySupportTickets,
  getSupportMessages,
  updateSupportTicketStatus,
  updateSupportTicketRepairDetails,
  getSupportOrganizations,
  getSupportOrgAdmins,
} from '../controllers/support.controller.js';

const router = express.Router();

router.use(protect);
router.use(tenantScope);

router.get('/organizations', requireRole('super_admin'), getSupportOrganizations);
router.get('/org-admins/:orgId', requireRole('super_admin'), getSupportOrgAdmins);

router.route('/')
  .post(createSupportTicket)
  .get(getMySupportTickets);

router.get('/:ticketId/messages', getSupportMessages);
router.patch('/:ticketId/status', updateSupportTicketStatus);
router.patch('/:ticketId/repair', updateSupportTicketRepairDetails);

export default router;

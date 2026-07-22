import express from 'express';
import { register, login, refresh, createOrgUser, getOrgUsers } from '../controllers/auth.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { tenantScope } from '../middlewares/tenant.middleware.js';
import { requireRole } from '../middlewares/rbac.middleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);

// Org Admin / Super Admin Staff Account Management (tenant scoped)
router.use('/users', protect, tenantScope);
router.route('/users')
  .post(requireRole('org_admin', 'super_admin'), createOrgUser)
  .get(requireRole('org_admin', 'super_admin'), getOrgUsers);

export default router;

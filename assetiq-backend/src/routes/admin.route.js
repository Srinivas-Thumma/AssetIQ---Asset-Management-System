import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/rbac.middleware.js';
import {
  getOrganizations,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  inspectOrganization,
  getPlatformAnalytics,
  getPlans,
  createPlan,
  updatePlan,
  deletePlan,
  getStorageUsage
} from '../controllers/admin.controller.js';

const router = express.Router();

// Apply auth globally to this router (Admin operations bypass tenantScope middleware to execute unscoped queries)
router.use(protect);
router.use(requireRole('super_admin'));

router.route('/organizations')
  .get(getOrganizations)
  .post(createOrganization);

router.route('/organizations/:id')
  .put(updateOrganization)
  .delete(deleteOrganization);

router.get('/organizations/:id/inspect', inspectOrganization);
router.get('/analytics', getPlatformAnalytics);
router.get('/storage-usage', getStorageUsage);

router.route('/plans')
  .get(getPlans)
  .post(createPlan);

router.route('/plans/:id')
  .put(updatePlan)
  .delete(deletePlan);

export default router;

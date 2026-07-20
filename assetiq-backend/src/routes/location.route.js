import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { tenantScope } from '../middlewares/tenant.middleware.js';
import { requireRole } from '../middlewares/rbac.middleware.js';
import {
  getBranches,
  createBranch,
  getBuildings,
  createBuilding,
  getFloors,
  createFloor,
  getRooms,
  createRoom,
  getLocationTree
} from '../controllers/location.controller.js';

const router = express.Router();

// Apply auth and tenant scoping globally to this router
router.use(protect);
router.use(tenantScope);

// Hierarchy tree
router.get('/tree', getLocationTree);

// Branches
router.route('/branches')
  .get(getBranches)
  .post(requireRole('org_admin', 'super_admin'), createBranch);

// Buildings
router.route('/buildings')
  .get(getBuildings)
  .post(requireRole('org_admin', 'super_admin'), createBuilding);

// Floors
router.route('/floors')
  .get(getFloors)
  .post(requireRole('org_admin', 'super_admin'), createFloor);

// Rooms
router.route('/rooms')
  .get(getRooms)
  .post(requireRole('org_admin', 'super_admin'), createRoom);

export default router;

import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { tenantScope } from '../middlewares/tenant.middleware.js';
import { requireRole } from '../middlewares/rbac.middleware.js';
import {
  getBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  getBuildings,
  createBuilding,
  updateBuilding,
  deleteBuilding,
  getFloors,
  createFloor,
  updateFloor,
  deleteFloor,
  getRooms,
  createRoom,
  updateRoom,
  deleteRoom,
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

router.route('/branches/:id')
  .put(requireRole('org_admin', 'super_admin'), updateBranch)
  .delete(requireRole('org_admin', 'super_admin'), deleteBranch);

// Buildings
router.route('/buildings')
  .get(getBuildings)
  .post(requireRole('org_admin', 'super_admin'), createBuilding);

router.route('/buildings/:id')
  .put(requireRole('org_admin', 'super_admin'), updateBuilding)
  .delete(requireRole('org_admin', 'super_admin'), deleteBuilding);

// Floors
router.route('/floors')
  .get(getFloors)
  .post(requireRole('org_admin', 'super_admin'), createFloor);

router.route('/floors/:id')
  .put(requireRole('org_admin', 'super_admin'), updateFloor)
  .delete(requireRole('org_admin', 'super_admin'), deleteFloor);

// Rooms
router.route('/rooms')
  .get(getRooms)
  .post(requireRole('org_admin', 'super_admin'), createRoom);

router.route('/rooms/:id')
  .put(requireRole('org_admin', 'super_admin'), updateRoom)
  .delete(requireRole('org_admin', 'super_admin'), deleteRoom);

export default router;

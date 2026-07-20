import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { tenantScope } from '../middlewares/tenant.middleware.js';
import { requireRole } from '../middlewares/rbac.middleware.js';
import {
  getDepartments,
  createDepartment,
  getCategories,
  createCategory,
  getVendors,
  createVendor,
  getEmployees,
  createEmployee
} from '../controllers/lookup.controller.js';

const router = express.Router();

// Apply auth and tenant scoping globally to these lookup routes
router.use(protect);
router.use(tenantScope);

// Departments
router.route('/departments')
  .get(getDepartments)
  .post(requireRole('org_admin', 'super_admin'), createDepartment);

// Categories
router.route('/categories')
  .get(getCategories)
  .post(requireRole('org_admin', 'super_admin'), createCategory);

// Vendors
router.route('/vendors')
  .get(getVendors)
  .post(requireRole('org_admin', 'super_admin', 'asset_manager'), createVendor);

// Employees
router.route('/employees')
  .get(getEmployees)
  .post(requireRole('org_admin', 'super_admin', 'asset_manager'), createEmployee);

export default router;

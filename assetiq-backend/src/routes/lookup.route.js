import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { tenantScope } from '../middlewares/tenant.middleware.js';
import { requireRole } from '../middlewares/rbac.middleware.js';
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getVendors,
  createVendor,
  updateVendor,
  deleteVendor,
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee
} from '../controllers/lookup.controller.js';

const router = express.Router();

// Apply auth and tenant scoping globally to these lookup routes
router.use(protect);
router.use(tenantScope);

// Departments
router.route('/departments')
  .get(getDepartments)
  .post(requireRole('org_admin', 'super_admin'), createDepartment);

router.route('/departments/:id')
  .put(requireRole('org_admin', 'super_admin'), updateDepartment)
  .delete(requireRole('org_admin', 'super_admin'), deleteDepartment);

// Categories
router.route('/categories')
  .get(getCategories)
  .post(requireRole('org_admin', 'super_admin'), createCategory);

router.route('/categories/:id')
  .put(requireRole('org_admin', 'super_admin'), updateCategory)
  .delete(requireRole('org_admin', 'super_admin'), deleteCategory);

// Vendors
router.route('/vendors')
  .get(getVendors)
  .post(requireRole('org_admin', 'super_admin', 'asset_manager'), createVendor);

router.route('/vendors/:id')
  .put(requireRole('org_admin', 'super_admin'), updateVendor)
  .delete(requireRole('org_admin', 'super_admin'), deleteVendor);

// Employees
router.route('/employees')
  .get(getEmployees)
  .post(requireRole('org_admin', 'super_admin', 'asset_manager'), createEmployee);

router.route('/employees/:id')
  .put(requireRole('org_admin', 'super_admin'), updateEmployee)
  .delete(requireRole('org_admin', 'super_admin'), deleteEmployee);

export default router;

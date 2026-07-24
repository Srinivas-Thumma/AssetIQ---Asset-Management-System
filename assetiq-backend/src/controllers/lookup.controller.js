import { Department } from '../models/Department.js';
import { Category } from '../models/Category.js';
import { Vendor } from '../models/Vendor.js';
import { Employee } from '../models/Employee.js';
import { Asset } from '../models/Asset.js';
import { User } from '../models/User.js';
import { sendResponse } from '../utils/apiResponse.js';

// --- Departments ---
export const getDepartments = async (req, res, next) => {
  try {
    const list = await Department.find();
    return sendResponse(res, 200, true, 'Departments retrieved', list);
  } catch (error) {
    next(error);
  }
};

export const createDepartment = async (req, res, next) => {
  try {
    const { name, code } = req.body;
    if (!name || !code) {
      return sendResponse(res, 400, false, 'Name and code are required');
    }
    const record = await Department.create({ name, code });
    return sendResponse(res, 201, true, 'Department created', record);
  } catch (error) {
    next(error);
  }
};

export const updateDepartment = async (req, res, next) => {
  try {
    const { name, code } = req.body;
    const record = await Department.findById(req.params.id);
    if (!record) {
      return sendResponse(res, 404, false, 'Department not found');
    }
    if (name) record.name = name;
    if (code) record.code = code;
    await record.save();
    return sendResponse(res, 200, true, 'Department updated successfully', record);
  } catch (error) {
    next(error);
  }
};

export const deleteDepartment = async (req, res, next) => {
  try {
    const inUse = await Employee.exists({ departmentId: req.params.id });
    if (inUse) {
      return sendResponse(res, 400, false, 'Cannot delete department: employees are currently assigned to it');
    }
    const record = await Department.findByIdAndDelete(req.params.id);
    if (!record) {
      return sendResponse(res, 404, false, 'Department not found');
    }
    return sendResponse(res, 200, true, 'Department deleted successfully', null);
  } catch (error) {
    next(error);
  }
};

// --- Categories ---
export const getCategories = async (req, res, next) => {
  try {
    const list = await Category.find();
    return sendResponse(res, 200, true, 'Categories retrieved', list);
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const { name, code } = req.body;
    if (!name || !code) {
      return sendResponse(res, 400, false, 'Name and code are required');
    }
    const record = await Category.create({ name, code });
    return sendResponse(res, 201, true, 'Category created', record);
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const { name, code } = req.body;
    const record = await Category.findById(req.params.id);
    if (!record) {
      return sendResponse(res, 404, false, 'Category not found');
    }
    if (name) record.name = name;
    if (code) record.code = code;
    await record.save();
    return sendResponse(res, 200, true, 'Category updated successfully', record);
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const inUse = await Asset.exists({ categoryId: req.params.id });
    if (inUse) {
      return sendResponse(res, 400, false, 'Cannot delete category: assets are currently registered under it');
    }
    const record = await Category.findByIdAndDelete(req.params.id);
    if (!record) {
      return sendResponse(res, 404, false, 'Category not found');
    }
    return sendResponse(res, 200, true, 'Category deleted successfully', null);
  } catch (error) {
    next(error);
  }
};

// --- Vendors ---
export const getVendors = async (req, res, next) => {
  try {
    const list = await Vendor.find();
    return sendResponse(res, 200, true, 'Vendors retrieved', list);
  } catch (error) {
    next(error);
  }
};

export const createVendor = async (req, res, next) => {
  try {
    const { name, contactEmail, phone, address } = req.body;
    if (!name) {
      return sendResponse(res, 400, false, 'Vendor name is required');
    }
    const record = await Vendor.create({ name, contactEmail, phone, address });
    return sendResponse(res, 201, true, 'Vendor created', record);
  } catch (error) {
    next(error);
  }
};

export const updateVendor = async (req, res, next) => {
  try {
    const { name, contactEmail, phone, address } = req.body;
    const record = await Vendor.findById(req.params.id);
    if (!record) {
      return sendResponse(res, 404, false, 'Vendor not found');
    }
    if (name) record.name = name;
    if (contactEmail !== undefined) record.contactEmail = contactEmail;
    if (phone !== undefined) record.phone = phone;
    if (address !== undefined) record.address = address;
    await record.save();
    return sendResponse(res, 200, true, 'Vendor updated successfully', record);
  } catch (error) {
    next(error);
  }
};

export const deleteVendor = async (req, res, next) => {
  try {
    const inUse = await Asset.exists({ vendorId: req.params.id });
    if (inUse) {
      return sendResponse(res, 400, false, 'Cannot delete vendor: assets reference this supplier');
    }
    const record = await Vendor.findByIdAndDelete(req.params.id);
    if (!record) {
      return sendResponse(res, 404, false, 'Vendor not found');
    }
    return sendResponse(res, 200, true, 'Vendor deleted successfully', null);
  } catch (error) {
    next(error);
  }
};

// --- Employees ---
export const getEmployees = async (req, res, next) => {
  try {
    const list = await Employee.find().populate('departmentId');
    return sendResponse(res, 200, true, 'Employees retrieved', list);
  } catch (error) {
    next(error);
  }
};

export const createEmployee = async (req, res, next) => {
  try {
    const { name, employeeId, email, departmentId } = req.body;
    if (!name || !employeeId || !email || !departmentId) {
      return sendResponse(res, 400, false, 'name, employeeId, email, and departmentId are required');
    }
    const record = await Employee.create({ name, employeeId, email, departmentId });
    return sendResponse(res, 201, true, 'Employee created', record);
  } catch (error) {
    next(error);
  }
};

export const updateEmployee = async (req, res, next) => {
  try {
    const { name, employeeId, email, departmentId } = req.body;
    const record = await Employee.findById(req.params.id);
    if (!record) {
      return sendResponse(res, 404, false, 'Employee not found');
    }
    if (name) record.name = name;
    if (employeeId) record.employeeId = employeeId;
    if (email) record.email = email;
    if (departmentId) record.departmentId = departmentId;
    await record.save();
    return sendResponse(res, 200, true, 'Employee updated successfully', record);
  } catch (error) {
    next(error);
  }
};

export const deleteEmployee = async (req, res, next) => {
  try {
    // 1. Guard against deleting employees with live asset assignments
    const holdsAssets = await Asset.exists({ assignedTo: req.params.id });
    if (holdsAssets) {
      return sendResponse(res, 400, false, 'Cannot delete employee: they currently hold active asset assignments');
    }

    // 2. Guard against deleting employees with active system user accounts
    const hasUserAccount = await User.exists({ employeeRef: req.params.id });
    if (hasUserAccount) {
      return sendResponse(res, 400, false, 'Cannot delete employee: they have an active system login account. Delete the user account first.');
    }

    const record = await Employee.findByIdAndDelete(req.params.id);
    if (!record) {
      return sendResponse(res, 404, false, 'Employee not found');
    }
    return sendResponse(res, 200, true, 'Employee deleted successfully', null);
  } catch (error) {
    next(error);
  }
};

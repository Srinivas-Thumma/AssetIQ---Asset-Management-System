import { Department } from '../models/Department.js';
import { Category } from '../models/Category.js';
import { Vendor } from '../models/Vendor.js';
import { Employee } from '../models/Employee.js';
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

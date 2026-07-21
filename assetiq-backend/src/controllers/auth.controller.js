import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { Organization } from '../models/Organization.js';
import { Plan } from '../models/Plan.js';
import { Branch } from '../models/Branch.js';
import { Building } from '../models/Building.js';
import { Floor } from '../models/Floor.js';
import { Room } from '../models/Room.js';
import { Department } from '../models/Department.js';
import { Category } from '../models/Category.js';
import { Employee } from '../models/Employee.js';
import { sendResponse } from '../utils/apiResponse.js';
import { runWithTenant } from '../utils/tenantContext.js';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  orgName: z.string().min(2, 'Organization name must be at least 2 characters'),
  orgSlug: z.string().min(2, 'Slug must be at least 2 characters').regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and dashes'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user._id, role: user.role, organizationId: user.organizationId },
    env.JWT_ACCESS_SECRET,
    { expiresIn: '1d' } // 1 day for access tokens in local development
  );
  const refreshToken = jwt.sign(
    { id: user._id },
    env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  return { accessToken, refreshToken };
};

export const register = async (req, res, next) => {
  try {
    const validated = registerSchema.parse(req.body);

    // 1. Check if organization slug or user email already exists
    const existingOrg = await Organization.findOne({ slug: validated.orgSlug });
    if (existingOrg) {
      return sendResponse(res, 400, false, 'Organization slug is already taken');
    }

    // 2. Fetch or create a default Free Plan
    let freePlan = await Plan.findOne({ slug: 'free' });
    if (!freePlan) {
      freePlan = await Plan.create({
        name: 'Free Tier',
        slug: 'free',
        price: 0,
        maxAssets: 100,
      });
    }

    // 3. Create the Organization
    const newOrg = await Organization.create({
      name: validated.orgName,
      slug: validated.orgSlug,
      planId: freePlan._id,
    });

    const orgIdString = newOrg._id.toString();

    // Run the user creation and seed operations within the tenant context
    const result = await runWithTenant(orgIdString, async () => {
      // Check if user already exists
      const existingUser = await User.findOne({ email: validated.email });
      if (existingUser) {
        throw new Error('Email is already registered in this organization');
      }

      // Create Admin User
      const newAdmin = await User.create({
        email: validated.email,
        passwordHash: validated.password,
        role: 'org_admin',
        organizationId: orgIdString,
      });

      // Seed Default Tenant Data (Branch, Building, Floor, Room, Department, Category)
      const defaultBranch = await Branch.create({ name: 'Headquarters', code: 'HQ' });
      const defaultBuilding = await Building.create({ branchId: defaultBranch._id, name: 'Main Office', code: 'MO' });
      const defaultFloor = await Floor.create({ buildingId: defaultBuilding._id, name: 'Ground Floor', number: 0 });
      const defaultRoom = await Room.create({ floorId: defaultFloor._id, name: 'IT Lab Room', code: 'IT-LAB' });

      const defaultDept = await Department.create({ name: 'Information Technology', code: 'IT' });
      await Category.create({ name: 'Laptops & Computers', code: 'IT-COMP' });
      await Category.create({ name: 'HVAC Systems', code: 'HVAC' });

      // Seed an Employee profile for testing
      const managerEmp = await Employee.create({
        name: 'Jane Manager',
        employeeId: 'EMP-MGR-01',
        email: `manager@${validated.orgSlug}.com`,
        departmentId: defaultDept._id
      });

      const regularEmp = await Employee.create({
        name: 'John Staff',
        employeeId: 'EMP-STF-02',
        email: `employee@${validated.orgSlug}.com`,
        departmentId: defaultDept._id
      });

      // Create login users for manager and employee
      await User.create({
        email: `manager@${validated.orgSlug}.com`,
        passwordHash: 'password123',
        role: 'asset_manager',
        employeeRef: managerEmp._id,
        organizationId: orgIdString
      });

      await User.create({
        email: `employee@${validated.orgSlug}.com`,
        passwordHash: 'password123',
        role: 'employee',
        employeeRef: regularEmp._id,
        organizationId: orgIdString
      });

      return { user: newAdmin };
    });

    const { accessToken, refreshToken } = generateTokens(result.user);

    return sendResponse(res, 201, true, 'Organization and Admin registered successfully', {
      user: {
        id: result.user._id,
        email: result.user.email,
        role: result.user.role,
        organizationId: result.user.organizationId,
      },
      organization: newOrg,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const validated = loginSchema.parse(req.body);

    // Bypass tenant scope to find user globally (and verify organization is active)
    const user = await User.findOne({ email: validated.email });
    if (!user) {
      return sendResponse(res, 401, false, 'Invalid credentials');
    }

    const isMatch = await user.comparePassword(validated.password);
    if (!isMatch) {
      return sendResponse(res, 401, false, 'Invalid credentials');
    }

    if (user.status !== 'active') {
      return sendResponse(res, 403, false, 'Your user account is inactive');
    }

    // Verify Organization status
    if (user.organizationId) {
      const org = await Organization.findById(user.organizationId);
      if (org && org.status === 'suspended') {
        return sendResponse(res, 403, false, 'Your organization account is suspended. Contact Support.');
      }
    }

    const { accessToken, refreshToken } = generateTokens(user);

    return sendResponse(res, 200, true, 'Logged in successfully', {
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return sendResponse(res, 400, false, 'Refresh token is required');
  }

  try {
    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.status !== 'active') {
      return sendResponse(res, 401, false, 'User not found or is suspended');
    }

    const tokens = generateTokens(user);

    return sendResponse(res, 200, true, 'Token refreshed successfully', {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error) {
    return sendResponse(res, 401, false, 'Invalid or expired refresh token');
  }
};

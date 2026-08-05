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
    { expiresIn: '15m' } // 15 minutes for access tokens in local development
  );
  const refreshToken = jwt.sign(
    { id: user._id },
    env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  return { accessToken, refreshToken };
};

/**
 * Sets access and refresh tokens as secure HTTP-only cookies in the HTTP response.
 * 
 * Connection Workflow:
 * - Frontend: When fetching with { credentials: 'include' } in AuthContext.apiCall,
 *   the browser automatically includes these cookies in the Request Headers.
 * - Backend: The cookieParser parses headers on every incoming request, and the
 *   protect middleware extracts and validates 'accessToken'.
 */
const setAuthCookies = (res, accessToken, refreshToken) => {
  const isProd = process.env.NODE_ENV === 'production';

  // 1. Access Token: Used to authorize all general requests.
  res.cookie('accessToken', accessToken, {
    httpOnly: true,              // 🔒 Prevents client JavaScript (XSS) from reading tokens.
    secure: isProd,              // 🔒 Requires HTTPS in production (false on localhost HTTP).
    sameSite: 'lax',             // 🔒 Blocks cross-site Request Forgery (CSRF) for standard actions.
    maxAge: 24 * 60 * 60 * 1000, // 🕒 1 day expiration (matches JWT_ACCESS_SECRET payload lifetime).
  });

  // 2. Refresh Token: Used strictly to rotate access tokens when they expire.
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/api/v1/auth/refresh', // 🎯 Scope limiting: Browser ONLY sends this cookie to the refresh route.
    maxAge: 7 * 24 * 60 * 60 * 1000, // 🕒 7 days expiration.
  });
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

      // Create Admin User (Clean slate initialization: no mock branches, buildings, or employees)
      const newAdmin = await User.create({
        email: validated.email,
        passwordHash: validated.password,
        role: 'org_admin',
        organizationId: orgIdString,
      });

      return { user: newAdmin };
    });

    const { accessToken, refreshToken } = generateTokens(result.user);
    setAuthCookies(res, accessToken, refreshToken);

    return sendResponse(res, 201, true, 'Organization and Admin registered successfully', {
      user: {
        id: result.user._id,
        email: result.user.email,
        role: result.user.role,
        organizationId: result.user.organizationId,
      },
      organization: newOrg,
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
    setAuthCookies(res, accessToken, refreshToken);

    return sendResponse(res, 200, true, 'Logged in successfully', {
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req, res, next) => {
  const refreshToken = req.cookies.refreshToken;

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
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    return sendResponse(res, 200, true, 'Token refreshed successfully', null);
  } catch (error) {
    return sendResponse(res, 401, false, 'Invalid or expired refresh token');
  }
};

export const logout = async (req, res, next) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken', { path: '/api/v1/auth/refresh' });
  return sendResponse(res, 200, true, 'Logged out successfully', null);
};

export const createOrgUser = async (req, res, next) => {
  try {
    const { name, email, password, role, departmentId } = req.body;
    if (!name || !email || !password || !role || !departmentId) {
      return sendResponse(res, 400, false, 'name, email, password, role, and departmentId are required');
    }

    if (!['asset_manager', 'employee'].includes(role)) {
      return sendResponse(res, 400, false, 'Invalid role choice. Must be asset_manager or employee');
    }

    // Check email uniqueness globally
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return sendResponse(res, 400, false, 'Email is already registered on this platform');
    }

    // 1. Create Employee Profile record
    const empId = `EMP-${Date.now().toString().slice(-4)}`;
    const employee = await Employee.create({
      name,
      employeeId: empId,
      email,
      departmentId,
      organizationId: req.orgId
    });

    // 2. Create User login credentials
    const user = await User.create({
      email,
      passwordHash: password, // Auto-hashed by pre-save User hook
      role,
      employeeRef: employee._id,
      organizationId: req.orgId
    });

    return sendResponse(res, 201, true, 'Staff login account registered successfully', {
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      },
      employee
    });
  } catch (error) {
    next(error);
  }
};

export const getOrgUsers = async (req, res, next) => {
  try {
    const users = await User.find()
      .populate({
        path: 'employeeRef',
        populate: { path: 'departmentId' }
      });
    return sendResponse(res, 200, true, 'Staff accounts retrieved', users);
  } catch (error) {
    next(error);
  }
};

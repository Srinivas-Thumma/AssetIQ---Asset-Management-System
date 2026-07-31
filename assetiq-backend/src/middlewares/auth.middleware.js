import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';

/**
 * Core Token Verification Helper:
 * - Decodes JWT signature using backend secret.
 * - Queries matching User from MongoDB.
 * - Ensures user account is active.
 * Shared between HTTP protect middleware and Socket.IO handshake auth middleware.
 */

export const verifyTokenAndGetUser = async (token) => {
  if (!token) {
    const error = new Error('No authentication token provided');
    error.statusCode = 401;
    throw error;
  }

  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
  const user = await User.findById(decoded.id);

  if (!user) {
    const error = new Error('The user belonging to this token no longer exists');
    error.statusCode = 401;
    throw error;
  }

  if (user.status !== 'active') {
    const error = new Error('This user account is inactive or suspended');
    error.statusCode = 403;
    throw error;
  }

  return user;
};

/**
 * Authentication Gatekeeper Middleware:
 * - Checks, extracts, and verifies the accessToken HTTP-only cookie on every incoming API request.
 */

export const protect = async (req, res, next) => {
  const token = req.cookies?.accessToken;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route, no token provided',
    });
  }

  try {
    const user = await verifyTokenAndGetUser(token);
    req.user = user;
    req.orgId = user.organizationId;
    next();
  } catch (error) {
    console.error('JWT Auth Error:', error.message);
    const statusCode = error.statusCode || 401;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Token is invalid or has expired',
    });
  }
};

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You don't have permission",
      });
    }

    next();
  };
};

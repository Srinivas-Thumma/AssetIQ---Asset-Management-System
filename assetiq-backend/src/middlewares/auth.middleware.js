import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';

/**
 * Authentication Gatekeeper Middleware:
 * - Checks, extracts, and verifies the accessToken HTTP-only cookie on every incoming API request.
 * 
 * Connection workflow:
 * - Reads cookie populated by 'cookie-parser' middleware.
 * - Decrypts payload containing user ID.
 * - Queries User from MongoDB.
 * - Attaches user and organization context (req.orgId) which is picked up downstream
 *   by the 'tenantScope' middleware to configure AsyncLocalStorage thread-safety.
 */
export const protect = async (req, res, next) => {
  // 1. Retrieve the HTTP-only cookie containing the JWT Access Token
  const token = req.cookies?.accessToken;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route, no token provided',
    });
  }

  try {
    // 2. Decode and verify the JWT signature using backend secret
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);

    // 3. Find the matching User in the database
    // (Note: because getTenantId() is not set yet, this query runs unscoped, which is safe since we query by unique MongoDB ObjectId)
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists',
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'This user account is inactive or suspended',
      });
    }

    // 4. Attach contexts to Request object. 
    // req.orgId is extracted by tenantScope middleware downstream to establish the tenant storage workspace.
    req.user = user;
    req.orgId = user.organizationId;
    
    next();
  } catch (error) {
    console.error('JWT Auth Error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Token is invalid or has expired',
    });
  }
};

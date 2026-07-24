import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';

export const protect = async (req, res, next) => {
  const token = req.cookies?.accessToken;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route, no token provided',
    });
  }
  // Find user. Note: since User has tenantScopePlugin, we must run this query 
    // under tenant scope or bypass it. But wait! Since user registration/login JWT contains
    // organizationId, we can set tenant storage context before loading the user, or 
    // bypass tenantScopePlugin for auth validation.
    // Wait! Since JWT payload has organizationId, we can run this query using getTenantId() 
    // set or we can let User model handle it because User has tenantScopePlugin which needs 
    // organizationId in AsyncLocalStorage.
    // Let's make sure the protect middleware retrieves user by ID by bypass-scoping, 
    // or by setting the context first!
    // If we set the tenantStorage context before doing User.findById, it will work perfectly!
    // Let's write the code to retrieve the user by ID and attach it.
    // To do that, we can temporarily retrieve the user.
    // Wait, User has a tenantScopePlugin. If getTenantId() is not set yet, User.findById(decoded.id) 
    // will execute without scoping, which is perfectly safe since we are fetching by a unique MongoDB ObjectId!

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);

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

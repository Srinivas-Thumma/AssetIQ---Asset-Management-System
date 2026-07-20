import { runWithTenant } from '../utils/tenantContext.js';

export const tenantScope = (req, res, next) => {
  if (!req.user) {
    return next();
  }

  let orgId = req.user.organizationId;

  // Super admin can override the active tenant scope using X-Tenant-ID header
  if (req.user.role === 'super_admin' && req.headers['x-tenant-id']) {
    orgId = req.headers['x-tenant-id'];
  }

  // Attach organizationId to request object
  req.orgId = orgId ? orgId.toString() : null;

  if (req.orgId) {
    // Run downstream request handlers inside AsyncLocalStorage context
    runWithTenant(req.orgId, () => {
      next();
    });
  } else {
    // If no orgId exists (e.g., global super admin stats), execute unscoped
    next();
  }
};

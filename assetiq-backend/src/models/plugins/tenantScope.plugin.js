import { getTenantId } from '../../utils/tenantContext.js';

/**
 * Tenant Scoping Plugin:
 * Automatically injects `organizationId` into schema models and attaches pre-hooks to intercept
 * Mongoose queries and document saves. Isolates database records per organization without requiring explicit `.where({ organizationId })` on every controller query.
 * 
 * Connection Workflow:
 * - Reads `getTenantId()` from AsyncLocalStorage (set by tenantScope HTTP middleware).
 * - Dynamically appends `{ organizationId: tenantId }` to all read/write database operations.
 */

export function tenantScopePlugin(schema) {
  // Ensure schema possesses indexed organizationId field
  if (!schema.path('organizationId')) {
    schema.add({
      organizationId: {
        type: String,
        required: true,
        index: true,
      },
    });
  }

  // Pre-query hook to automatically append tenantId filter to database queries
  const autoScopeQuery = function (next) {
    const tenantId = getTenantId();
    if (tenantId) {
      this.where({ organizationId: tenantId });
    }
    next();
  };

  const queryHooks = [
    'find',
    'findOne',
    'count',
    'countDocuments',
    'distinct',
    'findOneAndUpdate',
    'updateOne',
    'updateMany',
    'deleteOne',
    'deleteMany',
  ];

  queryHooks.forEach((hook) => {
    schema.pre(hook, autoScopeQuery);
  });

  // Pre-validate hook to automatically populate organizationId on new documents
  schema.pre('validate', function (next) {
    const tenantId = getTenantId();
    if (tenantId && !this.organizationId) {
      this.organizationId = tenantId;
    }
    next();
  });
}

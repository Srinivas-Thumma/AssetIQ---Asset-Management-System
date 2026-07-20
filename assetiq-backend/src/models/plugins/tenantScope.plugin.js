import { getTenantId } from '../../utils/tenantContext.js';

export function tenantScopePlugin(schema) {
  // Add organizationId field if it doesn't already exist
  if (!schema.path('organizationId')) {
    schema.add({
      organizationId: {
        type: String,
        required: true,
        index: true,
      },
    });
  }

  // Pre-query hook to automatically scope database queries to the tenant
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

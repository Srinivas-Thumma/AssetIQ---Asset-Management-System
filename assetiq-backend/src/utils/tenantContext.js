import { AsyncLocalStorage } from 'async_hooks';

/**
 * Multi-Tenant Context Storage:
 * Uses Node.js AsyncLocalStorage to track the active organization ID across asynchronous execution threads
 * without needing to manually pass `organizationId` through every function parameter in the call stack.
 */
const tenantStorage = new AsyncLocalStorage();

/**
 * Wraps an asynchronous callback within a specific tenant context store.
 * Used during HTTP request processing, background jobs, and automated provisioning.
 */
export const runWithTenant = (organizationId, callback) => {
  return tenantStorage.run(organizationId, callback);
};

/**
 * Retrieves the currently active tenant organization ID for the running execution thread.
 * Returns `undefined` if executing in a global context (e.g. Platform Super Admin operations).
 */
export const getTenantId = () => {
  return tenantStorage.getStore();
};

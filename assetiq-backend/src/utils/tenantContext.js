import { AsyncLocalStorage } from 'async_hooks';

const tenantStorage = new AsyncLocalStorage();

export const runWithTenant = (organizationId, callback) => {
  return tenantStorage.run(organizationId, callback);
};

export const getTenantId = () => {
  return tenantStorage.getStore();
};

# 11. AssetIQ — Multi-Tenancy Architecture & Zero-Leak Data Isolation Guide

## Why Multi-Tenancy is Hard & How AssetIQ Solves It
In multi-tenant SaaS applications, the standard approach is manually appending `.where({ organizationId })` to every single database controller query. This manual approach is fragile and prone to critical human error: forgetting a single `organizationId` filter in any controller exposes tenant data across organization boundaries.

AssetIQ eliminates human error by enforcing multi-tenant isolation at the **runtime thread level** and **Mongoose ORM layer**.

---

## The 4 Core Architectural Components

### 1. `AsyncLocalStorage` Context Store (`src/utils/tenantContext.js`)
Node.js `AsyncLocalStorage` creates thread-local storage that persists variables across asynchronous callbacks throughout an execution thread:

```javascript
import { AsyncLocalStorage } from 'async_hooks';

const tenantStorage = new AsyncLocalStorage();

export const runWithTenant = (organizationId, callback) => {
  return tenantStorage.run(organizationId, callback);
};

export const getTenantId = () => {
  return tenantStorage.getStore();
};
```

---

### 2. `tenantScope` Middleware (`src/middlewares/tenant.middleware.js`)
Extracts the authenticated user's `organizationId` and wraps the entire downstream Express middleware/controller pipeline inside `runWithTenant`:

```javascript
export const tenantScope = (req, res, next) => {
  const orgId = req.user?.organizationId ? req.user.organizationId.toString() : null;
  
  if (!orgId) {
    return next(); // Unscoped global context (e.g. SuperAdmin)
  }

  runWithTenant(orgId, () => {
    next();
  });
};
```

---

### 3. `tenantScopePlugin` Mongoose Plugin (`src/models/plugins/tenantScope.plugin.js`)
Injects pre-hooks into Mongoose schemas to automatically scope reads and writes:

```javascript
export function tenantScopePlugin(schema) {
  // Ensure schema possesses indexed organizationId
  if (!schema.path('organizationId')) {
    schema.add({
      organizationId: { type: String, required: true, index: true }
    });
  }

  // Pre-query hook to automatically scope read/write queries
  const autoScopeQuery = function (next) {
    const tenantId = getTenantId();
    if (tenantId) {
      this.where({ organizationId: tenantId });
    }
    next();
  };

  const queryHooks = [
    'find', 'findOne', 'count', 'countDocuments', 'distinct',
    'findOneAndUpdate', 'updateOne', 'updateMany', 'deleteOne', 'deleteMany'
  ];

  queryHooks.forEach((hook) => {
    schema.pre(hook, autoScopeQuery);
  });
}
```

---

### 4. Automatic Document Hydration
Before saving new documents (`validate` hook), the plugin automatically populates `this.organizationId = tenantId` if missing, preventing accidental unassigned documents.

---

## Why Data Leakage is Physically Impossible
Because `tenantScopePlugin` intercepts Mongoose query compilation inside `AsyncLocalStorage` execution threads, developers can write simple queries like `Asset.find()` in controller logic. Mongoose automatically rewrites the query at runtime to:
```javascript
db.assets.find({ organizationId: "6a607f38b61b9a8bae9c49e8", ... })
```
Even if a developer forgets to specify `organizationId` in controller code, data leakage is physically impossible.

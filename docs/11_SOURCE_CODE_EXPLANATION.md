# 11. AssetIQ — Source Code Handbook & Module Breakdown

## 1. Backend Core Source Files

### A. `assetiq-backend/src/utils/tenantContext.js`
- **Why it exists:** Provides thread-local storage to track the active organization ID across asynchronous execution contexts without passing `organizationId` through every function parameter.
- **When it executes:** Called on every HTTP request by `tenant.middleware.js` and read during every database query by `tenantScopePlugin`.
- **Who calls it:** [`tenant.middleware.js`](file:///C:/Projects/AssetIQ/assetiq-backend/src/middlewares/tenant.middleware.js) calls `runWithTenant()`; [`tenantScope.plugin.js`](file:///C:/Projects/AssetIQ/assetiq-backend/src/models/plugins/tenantScope.plugin.js) calls `getTenantId()`.
- **Who it calls:** Node.js native `async_hooks` module (`AsyncLocalStorage`).
- **Key Functions:**
  - `runWithTenant(organizationId, callback)`: Runs the callback within a specific tenant context store.
  - `getTenantId()`: Returns the currently active tenant ID for the running execution thread.
- **Real Example:**
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
- **Interview Question:** *How does `AsyncLocalStorage` work under the hood in Node.js?*  
  *Answer:* `AsyncLocalStorage` leverages Node's `async_hooks` module to map asynchronous resource creation and execution lifetimes, maintaining state across async/await boundaries without explicit argument passing.

---

### B. `assetiq-backend/src/models/plugins/tenantScope.plugin.js`
- **Why it exists:** Mongoose plugin that injects `organizationId` into schemas and automatically attaches query hooks to enforce multi-tenant data isolation.
- **When it executes:** Intercepts Mongoose model query compilation (`find`, `findOne`, `updateOne`, `deleteMany`) and document validation.
- **Who calls it:** Registered on Mongoose schemas in `src/models/*.js` (`schema.plugin(tenantScopePlugin)`).
- **Who it calls:** `getTenantId()` in `tenantContext.js`.
- **Key Functions:**
  - `tenantScopePlugin(schema)`: Adds `organizationId` field to schema if missing, registers `schema.pre(hook)` query interceptors, and attaches `validate` pre-hook for document hydration.
- **Interview Question:** *Why use a Mongoose plugin for multi-tenancy instead of putting filters in controller functions?*  
  *Answer:* A plugin enforces tenant query scoping at the ORM layer across all queries application-wide, preventing cross-tenant data leak bugs caused by developer oversight in controller code.

---

### C. `assetiq-backend/src/controllers/asset.controller.js`
- **Why it exists:** Implements business domain logic for asset management, custody assignment, status transitions, and hard-delete safety checks.
- **When it executes:** Called when clients make requests to `/api/v1/assets/*`.
- **Who calls it:** Express router (`asset.route.js`).
- **Who it calls:** Mongoose models (`Asset`, `AssetAssignment`, `MaintenanceRequest`), `ai.service.js`, and `apiResponse.js`.
- **Key Functions:**
  - `getAssets`: Fetches asset registry with search and status filters.
  - `updateAsset`: Manages Option B damage status rules and auto-creates corrective maintenance tickets.
  - `deleteAsset`: Executes `Promise.all` safety guards across 4 collections before allowing hard deletion.
- **Interview Question:** *How do you prevent orphaned relational records during asset deletion in Mongoose?*  
  *Answer:* Perform parallel `exists()` queries across all dependent collections (`MaintenanceRequest`, `MaintenanceHistory`, `Warranty`, `AssetAssignment`). If any records exist, block deletion and require soft-retirement (`status = 'retired'`).

---

## 2. Frontend Core Source Files

### A. `assetiq-frontend/src/context/AuthContext.jsx`
- **Why it exists:** Manages global authentication session state, user login/logout, and provides the `apiCall` fetch wrapper with automated 401 token refresh.
- **When it executes:** Mounts at application startup; `apiCall` runs on every API request.
- **Key Functions:**
  - `login(email, password)`: Sends credentials to `/api/v1/auth/login` and updates user state.
  - `apiCall(url, options)`: Intercepts 401 Unauthorized responses, invokes `POST /auth/refresh` to renew `HttpOnly` access token cookies, and retries original failed requests.
- **Interview Question:** *How do you handle silent JWT access token refresh in React without disrupting user UX?*  
  *Answer:* Intercept 401 response codes in a centralized API client wrapper (`apiCall`). When a 401 occurs, call the refresh endpoint silently, set the new session cookie, and retry the original failed HTTP request transparently.

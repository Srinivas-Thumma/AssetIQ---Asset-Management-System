# 14. AssetIQ — System Debugging & Root Cause Analysis Guide

## Real-World Bug Post-Mortems & Solutions

### 1. Ollama AI Health Calculation Timeout (`This operation was aborted`)
- **Symptom:** AI health score calculation fell back to mock values every time.
- **Root Cause:** In [`src/services/ai.service.js`](file:///C:/Projects/AssetIQ/assetiq-backend/src/services/ai.service.js), the `AbortController` timeout was set to `12000` ms (12s). Local model inference for `llama3.1:8b` took ~18.4s, causing every fetch request to abort at 12s and trigger the fallback catch block.
- **Solution:**
  1. Increased timeout from **12s to 60s** (`60000` ms).
  2. Implemented dynamic model selection prioritizing fast JSON models (`qwen2.5:3b` -> `llama3.1:8b`).
  3. Added regex sanitization (`replace(/<think>[\s\S]*?<\/think>/gi, '')`) to clean LLM response text before `JSON.parse()`.

---

### 2. Employee Deletion Blocked by Custody Reference Error
- **Symptom:** Deleting an employee with assigned assets displayed raw 400 errors instead of providing a return workflow.
- **Root Cause:** Database safety guard blocked deletion to prevent orphaned assets, but frontend lacked pre-flight filtering to catch the 400 response.
- **Solution:**
  1. Updated `handleDelete` in [`OrganizationSetup.jsx`](file:///C:/Projects/AssetIQ/assetiq-frontend/src/views/OrganizationSetup.jsx) to catch assigned asset block responses and trigger `OffboardingChecklistModal`.
  2. Wired `onReturnAll` to call `POST /api/v1/offboarding/:empId/return-all` followed automatically by `DELETE /api/v1/lookups/employees/:empId`.

---

### 3. Duplicate Icon Reference Error (`ShieldIcon is not defined`)
- **Symptom:** `App.jsx:226 Uncaught ReferenceError: ShieldIcon is not defined`.
- **Root Cause:** `ShieldCheck as ShieldIcon` was removed during a dead-code pass, but `ShieldIcon` was used in `navItems` array for the Warranties navigation item icon.
- **Solution:** Restored `ShieldCheck as ShieldIcon` in the `lucide-react` import list in [`App.jsx`](file:///C:/Projects/AssetIQ/assetiq-frontend/src/App.jsx).

---

### 4. Hard-Delete Guard Missing Collection Checks
- **Symptom:** Assets with historical assignment records could be permanently deleted, corrupting audit history.
- **Root Cause:** `deleteAsset` in [`asset.controller.js`](file:///C:/Projects/AssetIQ/assetiq-backend/src/controllers/asset.controller.js) only checked `MaintenanceRequest`, `MaintenanceHistory`, and `Warranty`, missing `AssetAssignment`.
- **Solution:** Added `AssetAssignment.exists({ assetId: asset._id })` to the `Promise.all` safety check array and blocked hard-delete if any assignment history exists.

---

### 5. Multi-Tenant Query Isolation Pre-Hook Bypass
- **Symptom:** Mongoose `.create()` or `.save()` calls did not populate `organizationId`.
- **Root Cause:** Pre-query hooks only intercepted `find` and `update` hooks, not `validate` document hooks.
- **Solution:** Added `schema.pre('validate', ...)` to [`tenantScope.plugin.js`](file:///C:/Projects/AssetIQ/assetiq-backend/src/models/plugins/tenantScope.plugin.js) to populate `this.organizationId = tenantId` automatically from `AsyncLocalStorage`.

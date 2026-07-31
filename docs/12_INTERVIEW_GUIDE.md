# 12. AssetIQ — Master Technical Interview Question Bank & Model Answers

## 1. System Architecture & Multi-Tenancy

### Q1: How did you design the multi-tenant architecture for AssetIQ?
**Model Answer:**
> "I designed a shared-database, shared-schema multi-tenant architecture using Node.js `AsyncLocalStorage` and Mongoose schema plugins. When a request enters Express, `tenantScope` middleware extracts the authenticated user's `organizationId` and wraps execution in `runWithTenant(orgId, callback)`. 
> 
> My custom `tenantScopePlugin` intercepts Mongoose query hooks (`find`, `updateOne`, `deleteMany`) and injects `{ organizationId: tenantId }` automatically from `AsyncLocalStorage`. This guarantees 100% data isolation without requiring manual query filters in controller functions."

---

### Q2: What are the tradeoffs of Shared Database Multi-Tenancy vs Database-per-Tenant?
**Model Answer:**
> "**Shared Database with ORM Scoping:**  
> - *Pros:* Significantly lower infrastructure costs, simplified database migration scripts, efficient connection pooling, easy global Super Admin reporting.  
> - *Cons:* Requires rigorous ORM query isolation to prevent cross-tenant data leaks.  
> 
> **Database-per-Tenant:**  
> - *Pros:* Physical data separation, independent tenant backups.  
> - *Cons:* Expensive database connection overhead, complex multi-tenant schema migration scripts."

---

## 2. Authentication, JWT & Security

### Q3: How do you protect JWT tokens against XSS and CSRF attacks?
**Model Answer:**
> "I store both `accessToken` (15m) and `refreshToken` (7d) in `HttpOnly` `SameSite=Strict` cookies configured via Express headers. 
> 
> Because the cookies are marked `HttpOnly`, browser JavaScript cannot read or access the tokens, completely preventing Cross-Site Scripting (XSS) token theft. To mitigate Cross-Site Request Forgery (CSRF), cookies use `SameSite` flags and CORS is restricted to trusted frontend origins with `credentials: true`."

---

### Q4: How does your React frontend handle token expiration without logging out the user?
**Model Answer:**
> "I built an `apiCall` HTTP wrapper inside `AuthContext.jsx`. When an API request fails with a `401 Unauthorized` status (indicating access token expiration), `apiCall` intercepts the error, pauses the request queue, and fires `POST /api/v1/auth/refresh`. The backend verifies the refresh token cookie, issues a fresh `accessToken` cookie, and `apiCall` automatically retries the original request transparently."

---

## 3. Local AI Engine & Performance Optimization

### Q5: How do you run local LLMs for AI health scoring without crashing the Node.js event loop?
**Model Answer:**
> "Ollama runs as an independent daemon process on port 11434, communicating with our Node.js server via HTTP REST calls (`POST /api/generate`). Because Node.js handles HTTP requests asynchronously, LLM inference runs out-of-process without blocking Node's main event loop.
> 
> To prevent long-running inferences from timing out HTTP requests, I built a 4-tier pipeline: check 24-hour fresh cache first, set a 60-second fetch abort timeout, sanitize model output via regex, and gracefully fall back to a deterministic calculation if Ollama is unreachable."

---

## 4. Operational Lifecycles & State Management

### Q6: Explain how you prevent orphaned asset records during employee offboarding.
**Model Answer:**
> "When an administrator attempts to delete an employee, the backend pre-flight query checks `Asset.exists({ assignedTo: employeeId })`. If assigned hardware exists, the backend returns a `400 Bad Request`.
> 
> The React frontend catches this 400 error and opens an `OffboardingChecklistModal` displaying the assigned hardware. The admin clicks 'Return All Assets to Stock', which executes `POST /offboarding/:empId/return-all` to unassign hardware and set status to `'available'`, followed automatically by `DELETE /lookups/employees/:empId` to delete the staff record safely."

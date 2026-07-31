# 13. AssetIQ — Software Architect Interview Master Guide

> **Purpose:** Comprehensive technical preparation guide for presenting AssetIQ in senior engineering and software architect interviews.

---

## 1. Core Architectural Topics & Interview Questions

### Q1: How did you implement multi-tenant data isolation in your SaaS architecture?
**Expected Answer:**
> "Rather than manually appending `.where({ organizationId })` to every single database query across controllers — which is error-prone and vulnerable to human oversight — I engineered automatic tenant scoping using Node.js `AsyncLocalStorage` and a custom Mongoose ORM plugin (`tenantScopePlugin`).
> 
> When an HTTP request enters Express, our `tenantScope` middleware extracts the authenticated user's `organizationId` and wraps the request thread in `runWithTenant(orgId, callback)`. My Mongoose schema plugin intercepts query compilation (`find`, `updateOne`, `deleteMany`) and injects `{ organizationId: activeTenantId }` automatically from `AsyncLocalStorage`. This guarantees zero cross-tenant data leaks at the ORM layer."

---

### Q2: Why did you choose local Ollama LLMs over OpenAI/Cloud APIs for AI health scoring?
**Expected Answer:**
> "Two major reasons: **Data Privacy** and **Cost Predictability**. Physical asset inventories, warranty serial numbers, and maintenance invoices contain sensitive corporate telemetry. Transmitting this data to third-party cloud APIs poses compliance risks.
> 
> By self-hosting local Ollama LLMs (`qwen2.5:3b` / `llama3.1:8b`) on-premise, no inventory data ever leaves our infrastructure. Additionally, it eliminates per-token cloud API billing. To guarantee high availability, I built a 4-tier decision tree with a 60-second execution timeout, regex response sanitization, and a deterministic mathematical fallback so local GPU delays never cause 500 errors."

---

### Q3: How do you handle JWT security and token expiration in React?
**Expected Answer:**
> "I implemented a dual-token JWT model using `HttpOnly` `SameSite` cookies to protect against XSS token theft. The access token expires in 15 minutes and the refresh token in 7 days.
> 
> On the client side, I built an `apiCall` wrapper in `AuthContext.jsx`. When an API request returns a `401 Unauthorized` error due to an expired access token, `apiCall` transparently catches the 401, issues a `POST /auth/refresh` request to obtain a fresh `HttpOnly` access token cookie, and automatically retries the original failed request without interrupting the user's workflow."

---

### Q4: Explain your Option B Asset Status Lifecycle.
**Expected Answer:**
> "I designed an event-driven asset custody and maintenance state machine:
> 1. When an asset is reported damaged, setting `status = 'damaged'` leaves it as `'damaged'` and auto-creates a high-priority open corrective maintenance request.
> 2. When a technician picks up the ticket (`status` becomes `'assigned'` or `'in_progress'`), a trigger in `updateMaintenanceRequest` transitions the asset status to `'under_maintenance'`.
> 3. Upon completing servicing (`completeMaintenance`), the system inspects custody state: if assigned to an employee, status is restored to `'assigned'`; if unassigned, it resets to `'available'`.
> 4. To protect audit integrity, hard deletion is blocked if historical records exist in `MaintenanceRequest`, `MaintenanceHistory`, `Warranty`, or `AssetAssignment` — requiring soft-retirement (`status = 'retired'`)."

---

## 2. Key Architecture Tradeoffs & Alternatives

| Choice Made | Alternative Considered | Why Choice Was Made (Tradeoff Rationale) |
| :--- | :--- | :--- |
| **`AsyncLocalStorage` Tenant Tracking** | Manual query filtering (`.where({ orgId })`) | Eliminates human error and boilerplate across controllers; minimal overhead in Node.js event loop. |
| **`HttpOnly` Cookie Session Storage** | LocalStorage / SessionStorage | Immune to XSS token theft; browser automatically handles cookie transmission. |
| **Local Ollama LLM** | OpenAI GPT-4 API | Zero third-party data privacy exposure and zero per-token cloud API costs. |
| **Single DB with Discriminator Scoping** | Database-per-tenant architecture | Simplifies database connection pooling, schema migrations, and hosting costs while maintaining isolation via ORM hooks. |

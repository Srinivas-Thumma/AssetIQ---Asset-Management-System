# 03 — Multi-Tenancy

## Overview
Every tenant (organization) shares the same MongoDB database and collections. Data isolation is enforced automatically by combining Node.js `AsyncLocalStorage` (which carries the active `organizationId` across async boundaries within a single request) with a Mongoose plugin that injects `{ organizationId: tenantId }` into every query and document save. Controllers never manually filter by `organizationId` — the plugin does it transparently.

---

## Files Involved

| File | Role |
|---|---|
| `src/utils/tenantContext.js` | Creates the `AsyncLocalStorage` store; exports `runWithTenant()` and `getTenantId()`. |
| `src/models/plugins/tenantScope.plugin.js` | Mongoose plugin: adds `organizationId` field to schemas and hooks into 9 query types + `validate` to auto-scope. |
| `src/middlewares/tenant.middleware.js` | `tenantScope` Express middleware: extracts `orgId` from `req.user`, wraps the rest of the request in `runWithTenant()`. |

---

## Step-by-Step Flow (Per HTTP Request)

```
1. protect middleware runs
   └─ Verifies JWT, attaches req.user (contains organizationId)

2. tenantScope middleware runs (tenant.middleware.js)
   ├─ Reads req.user.organizationId
   ├─ If user is super_admin AND request has X-Tenant-ID header,
   │    overrides orgId with that header value
   ├─ Sets req.orgId = orgId.toString() (or null for global super_admin)
   └─ If orgId exists: calls runWithTenant(orgId, () => next())
      └─ This wraps ALL downstream code in AsyncLocalStorage.run(orgId, ...)
         meaning getTenantId() returns orgId anywhere in the call stack

3. Controller runs (e.g. Asset.find())
   └─ Mongoose pre-query hook fires (tenantScope.plugin.js)
      └─ Calls getTenantId() → gets orgId from AsyncLocalStorage
      └─ Appends .where({ organizationId: orgId }) to the query
      └─ MongoDB only returns documents matching that org

4. On document create (new Asset(...).save() or Asset.create(...)):
   └─ pre('validate') hook fires
      └─ If document has no organizationId yet, sets it from getTenantId()
```

---

## The `AsyncLocalStorage` Mechanism

```js
// tenantContext.js
const tenantStorage = new AsyncLocalStorage();

export const runWithTenant = (organizationId, callback) =>
  tenantStorage.run(organizationId, callback);

export const getTenantId = () => tenantStorage.getStore();
```

`AsyncLocalStorage.run(value, fn)` makes `value` available via `getStore()` to any code called within `fn` — including across `await` boundaries and Promise chains — without passing it as a parameter. Each concurrent Node.js request gets its own isolated store value. This is the Node.js equivalent of Java's `ThreadLocal`.

---

## The Plugin Hooks

`tenantScope.plugin.js` registers pre-hooks on these 9 Mongoose operations:
`find`, `findOne`, `count`, `countDocuments`, `distinct`, `findOneAndUpdate`, `updateOne`, `updateMany`, `deleteOne`, `deleteMany`

It does NOT hook `findById` — but `findById` is syntactic sugar for `findOne({ _id: id })`, so it IS covered by the `findOne` hook.

It also does NOT hook `insertMany` or `bulkWrite`. Any bulk insert operation would not be automatically scoped.

---

## Models That Are NOT Tenant-Scoped

These models do not have `tenantScopePlugin` applied and store global data:

| Model | Reason Not Scoped |
|---|---|
| `Organization.js` | Represents tenants themselves — must be globally readable. |
| `Plan.js` | Subscription plans are global platform config. |
| `PlatformBanner.js` | System-wide banners for all tenants. |
| `User.js` | Login lookup during `auth.controller.js login()` is a global scan by email — tenant scoping would break cross-org login. |
| `AiAuditLog.js` | Has `organizationId` field set manually but no plugin. |

**Note on `User.js`:** Users DO have an `organizationId` field and it's set on creation, but the model doesn't use the plugin. The `getOrgUsers()` controller runs within tenant context (the route applies `tenantScope`), but the `User.find()` in that controller relies on the plugin being present to auto-scope — since the plugin is NOT on User, this means `getOrgUsers()` would return ALL users across all orgs unless manually filtered. This appears to be an inconsistency worth investigating.

---

## Super Admin Override

`tenant.middleware.js`:
```js
if (req.user.role === 'super_admin' && req.headers['x-tenant-id']) {
  orgId = req.headers['x-tenant-id'];
}
```

A `super_admin` user can inspect any tenant's data by passing the `X-Tenant-ID` header with the target org's ID. This is how the SuperAdmin view in the frontend can drill into a specific organization's records.

If a `super_admin` has no `X-Tenant-ID` header, `orgId` is null, `runWithTenant` is not called, and queries run without org scoping — returning records across all tenants (used for platform-wide analytics).

---

## Known Limitations / Things Worth Knowing

- **`insertMany` and `bulkWrite` are not hooked** — any code using these operations would bypass tenant isolation.
- **`User` model inconsistency** — described above. The `getOrgUsers` route applies `tenantScope` but the User model doesn't have the plugin, so the auto-scoping won't fire. This needs manual `{ organizationId: req.orgId }` filters, which don't appear to be present in the controller.
- **Background jobs bypass tenant scoping** — `healthScore.job.js` and `warrantyAlert.job.js` run outside any request context, so `getTenantId()` returns `undefined`. They query all documents across all tenants directly, then manually use `runWithTenant()` for specific writes (as seen in `warrantyAlert.job.js`).
- **`organizationId` is stored as String in some places and ObjectId in others** — `tenantScopePlugin` adds `organizationId` as `String`, but `Notification.js` declares it as `ObjectId`. Mixing types could cause query mismatches depending on how Mongoose coerces values.

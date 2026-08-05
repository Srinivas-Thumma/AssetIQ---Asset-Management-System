# 04 — Roles and Permissions

## Overview
AssetIQ has four roles: `super_admin`, `org_admin`, `asset_manager`, and `employee`. Role enforcement is handled in two places: the `requireRole(...roles)` middleware factory in `auth.middleware.js` (re-exported by `rbac.middleware.js`) applied directly on route definitions, and ad-hoc `req.user.role` checks inside controller functions for finer-grained logic (e.g. employees seeing only their own assets).

---

## Files Involved

| File | Role |
|---|---|
| `src/middlewares/auth.middleware.js` | Defines `requireRole()` factory (also re-used from rbac.middleware.js). |
| `src/middlewares/rbac.middleware.js` | Standalone re-export of `requireRole()` — same logic. |
| `src/routes/asset.route.js` | Route-level enforcement for asset CRUD and assignments. |
| `src/routes/maintenance.route.js` | Route-level enforcement for ticket management and completion. |
| `src/routes/auth.route.js` | Route-level enforcement for user creation. |
| `src/routes/admin.route.js` | Route-level enforcement for platform admin operations. |
| `src/controllers/asset.controller.js` | In-controller check: employees filtered to see only their assigned assets. |
| `src/controllers/maintenance.controller.js` | In-controller check: employee access to messages restricted to their own tickets. |
| `src/config/socket.js` | `checkChatAccessPermission()` — WebSocket-level RBAC for chat rooms. |

---

## `requireRole()` Mechanics

Both `auth.middleware.js` and `rbac.middleware.js` export the same function:

```js
export const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user) return res.status(401).json(...);
  if (!allowedRoles.includes(req.user.role))
    return res.status(403).json(`role '${req.user.role}' is not authorized`);
  next();
};
```

It is a middleware factory: `requireRole('org_admin', 'asset_manager')` returns a middleware function. It must be placed after `protect` (which sets `req.user`).

---

## Role: `super_admin`

**What it can do:**
- All routes under `/api/v1/admin/*` — `admin.route.js` line 24: `router.use(requireRole('super_admin'))` applied to the entire router.
  - `GET /admin/organizations` — list all orgs
  - `POST /admin/organizations` — create org
  - `PUT/DELETE /admin/organizations/:id` — update/delete org
  - `GET /admin/organizations/:id/inspect` — view org's data
  - `GET /admin/analytics` — platform-wide stats
  - `GET /admin/storage-usage`
  - `GET/POST/PUT/DELETE /admin/plans` — manage subscription plans
  - `GET /admin/tickets` — all tickets globally
  - `POST /admin/org-admin` — create an org_admin for any org
- Create/update/delete assets: `asset.route.js` lines 25, 29, 30 — `requireRole('org_admin', 'super_admin', 'asset_manager')`
- All maintenance ticket operations: `maintenance.route.js` lines 27, 28, 30
- Create org users: `auth.route.js` line 17 — `requireRole('org_admin', 'super_admin')`

**What it cannot do:**
- `createAsset` in `asset.controller.js` (line 103) has an explicit check: `if (req.user?.role === 'super_admin' || !req.orgId) return 403`. Despite `requireRole` allowing `super_admin` on the route, the controller blocks it. This is intentional — super admins manage orgs, not assets directly. **The `requireRole` on this route is misleading since the controller overrides it.**

**Tenant scoping:** A `super_admin` with no `X-Tenant-ID` header queries across all tenants. With `X-Tenant-ID`, queries scope to that org.

---

## Role: `org_admin`

**What it can do (with enforcement citation):**
- Create assets: `asset.route.js` line 25 — `requireRole('org_admin', 'super_admin', 'asset_manager')`
- Update/delete assets: `asset.route.js` lines 29, 30
- Assign/return assets: `asset.route.js` lines 33, 34
- Create maintenance tickets: `maintenance.route.js` line 24 — **no requireRole**, any authenticated tenant user can create
- Update/delete tickets: `maintenance.route.js` lines 27, 28 — `requireRole('org_admin', 'super_admin', 'asset_manager')`
- Complete maintenance: `maintenance.route.js` line 30 — `requireRole('org_admin', 'super_admin', 'asset_manager')`
- Create org users: `auth.route.js` line 17 — `requireRole('org_admin', 'super_admin')`
- Read org users: `auth.route.js` line 18 — `requireRole('org_admin', 'super_admin')`

**What it cannot do:**
- Access `/api/v1/admin/*` routes — `admin.route.js` applies `requireRole('super_admin')` to the entire router.

---

## Role: `asset_manager`

**What it can do (with enforcement citation):**
- Create/update/delete assets: `asset.route.js` lines 25, 29, 30
- Assign/return assets: `asset.route.js` lines 33, 34
- Update/delete/complete maintenance tickets: `maintenance.route.js` lines 27, 28, 30
- Read assets: `asset.route.js` line 24 — `GET /assets` has no `requireRole`, just `protect` + `tenantScope`

**What it cannot do:**
- Access `/api/v1/admin/*` — super_admin only.
- Create org users: `auth.route.js` line 17 — only `org_admin` and `super_admin`.

---

## Role: `employee`

**What it can do:**
- Read assets — `GET /api/v1/assets` has no `requireRole`. However, `asset.controller.js` line 21-22 filters results: `if (req.user.role === 'employee') { filter.assignedTo = req.user.employeeRef; }`. Employees only see assets assigned to them.
- Create maintenance tickets: `maintenance.route.js` line 24 — no `requireRole` restriction, any authenticated user can create.
- Read/send chat messages on their own tickets: checked inside `maintenance.controller.js` `getMaintenanceMessages()` and `createMaintenanceMessage()` — employee must be the ticket raiser OR the asset must be assigned to them.

**What it cannot do:**
- Update or delete maintenance tickets: `maintenance.route.js` lines 27, 28 — `requireRole('org_admin', 'super_admin', 'asset_manager')` blocks employee.
- Complete maintenance: `maintenance.route.js` line 30 — same restriction.
- Create/update/delete assets: `asset.route.js` lines 25, 29, 30 — blocked.
- Assign/return assets: `asset.route.js` lines 33, 34 — blocked.
- Create org users: blocked by `requireRole`.

---

## Known Limitations / Things Worth Knowing

- **`requireRole('super_admin')` on `asset.route.js` is partially overridden** — The route allows super_admin but the controller then explicitly rejects them. This creates a confusing inconsistency: the middleware says "allowed" but the controller says "not allowed."
- **`POST /api/v1/maintenance/` has no `requireRole`** — any authenticated user including employees can create maintenance tickets. This appears intentional (employees can report damage) but is not documented with a comment in the route file — only in the maintenance controller's JSDoc.
- **Chat permission is checked twice** — once at WebSocket join and re-verified on every `chat:message` event. The REST endpoints in `maintenance.controller.js` also perform their own employee access check. These are parallel implementations of the same logic and could drift if one is updated without the other.

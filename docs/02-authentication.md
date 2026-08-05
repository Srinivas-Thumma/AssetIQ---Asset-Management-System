# 02 — Authentication

## Overview
AssetIQ uses a dual-token JWT system. An `accessToken` (15-minute expiry) authorizes every API request; a `refreshToken` (7-day expiry) is used only to silently rotate an expired access token without requiring the user to log in again. Both tokens are stored in `HttpOnly` cookies — confirmed in `auth.controller.js` `setAuthCookies()`. Tokens are **never** written to `localStorage`; only non-sensitive user metadata (`id`, `email`, `role`, `organizationId`) is stored in `localStorage` for page-render purposes.

---

## Files Involved

| File | Role |
|---|---|
| `src/controllers/auth.controller.js` | All auth logic: register, login, refresh, logout, createOrgUser, getOrgUsers. |
| `src/middlewares/auth.middleware.js` | `protect` middleware (verifies accessToken on each request) and `verifyTokenAndGetUser` helper shared with Socket.IO. |
| `src/middlewares/rbac.middleware.js` | `requireRole(...roles)` factory — enforces role-based access per route. |
| `src/routes/auth.route.js` | Declares `/register`, `/login`, `/logout`, `/refresh`, `/users` routes. |
| `src/models/User.js` | User schema with `passwordHash` field hashed by a pre-save hook, `comparePassword` method, `status` field. |
| `assetiq-frontend/src/context/AuthContext.jsx` | Client-side auth state, `login()`, `register()`, `logout()`, `refreshAccessToken()`, and the central `apiCall()` wrapper. |

---

## Step-by-Step Flow

### Register (`POST /api/v1/auth/register`)
1. `auth.route.js` receives request — no `protect` or `requireRole` on this route.
2. `register()` in `auth.controller.js` runs `registerSchema.parse(req.body)` (Zod). Required: `email`, `password` (min 6), `orgName`, `orgSlug` (lowercase alphanumeric + dashes).
3. Checks `Organization.findOne({ slug })` — returns 400 if taken.
4. Finds or creates the `free` Plan.
5. Creates the `Organization` document.
6. Calls `runWithTenant(orgId, async () => { ... })` — wraps remaining DB writes in the new org's tenant context.
7. Inside tenant context: checks email uniqueness, creates a `User` with `role: 'org_admin'`. The plain password is assigned to `passwordHash` — the User model's `pre('save')` hook hashes it with bcrypt.
8. Calls `generateTokens(user)` — signs `accessToken` (15m, payload: `{ id, role, organizationId }`) and `refreshToken` (7d, payload: `{ id }` only).
9. Calls `setAuthCookies(res, accessToken, refreshToken)` — sets both as `HttpOnly`, `sameSite: 'lax'`, `secure` only in production. The `refreshToken` cookie has `path: '/api/v1/auth/refresh'` so the browser only sends it to that specific endpoint.
10. Returns 201 with user metadata and organization object (no tokens in response body).

### Login (`POST /api/v1/auth/login`)
1. `loginSchema.parse(req.body)` validates `email` and `password`.
2. `User.findOne({ email })` — runs **without** tenant context (global query, intentional) to find the user regardless of org.
3. `user.comparePassword(password)` — bcrypt compare.
4. Checks `user.status === 'active'`.
5. If user has an `organizationId`, checks `Organization.status !== 'suspended'`.
6. Generates tokens, sets cookies, returns user metadata.

### Token Refresh (`POST /api/v1/auth/refresh`)
1. Reads `req.cookies.refreshToken` — only sent by the browser because the refresh cookie has `path: '/api/v1/auth/refresh'`.
2. `jwt.verify(refreshToken, env.JWT_REFRESH_SECRET)` — validates signature and expiry.
3. `User.findById(decoded.id)` — confirms user still exists and is active.
4. Generates new token pair, sets new cookies.
5. Returns 200 with no data body (`null`).

**Note:** The refresh token itself is NOT rotated on every use — the same refresh cookie stays valid until its 7-day expiry. Only the access token is renewed.

### Logout (`POST /api/v1/auth/logout`)
1. `res.clearCookie('accessToken')` and `res.clearCookie('refreshToken', { path: '/api/v1/auth/refresh' })`.
2. No database write — there is no token blocklist/denylist. A stolen refresh token would still be valid until its 7-day expiry.

### `protect` Middleware (Every Protected Route)
1. Reads `req.cookies?.accessToken`.
2. Returns 401 immediately if no cookie.
3. Calls `verifyTokenAndGetUser(token)`:
   - `jwt.verify(token, env.JWT_ACCESS_SECRET)` — throws if expired or tampered.
   - `User.findById(decoded.id)` — confirms user still exists in DB.
   - Checks `user.status === 'active'`.
4. Sets `req.user = user` and `req.orgId = user.organizationId`.
5. Calls `next()`.

### Frontend: `apiCall()` Auto-Retry (`AuthContext.jsx`)
The `apiCall()` wrapper used by every view to make API requests:
1. Calls `fetch(url, { ...options, credentials: 'include' })` — `credentials: 'include'` forces browser to send cookies.
2. If response status is `401`, calls `refreshAccessToken()` which hits `POST /api/v1/auth/refresh`.
3. If refresh succeeds, retries the original request once.
4. If refresh fails (expired refresh token), calls `logout()` which clears `localStorage` and sets `user` to null, triggering redirect to `/login`.

**Important:** The `login()` and `register()` functions in `AuthContext.jsx` do NOT use `apiCall()` — they call `fetch()` directly without `credentials: 'include'`. This works because the backend sets the cookies in the `Set-Cookie` response header, and the browser stores them automatically on any response.

---

## Where Data Is Stored

### Collection: `users`
Key fields:
- `passwordHash` (String) — bcrypt hash stored here despite the name suggesting it's already hashed; the plain password is passed in and hashed by the pre-save hook.
- `role` — `'super_admin' | 'org_admin' | 'asset_manager' | 'employee'`
- `organizationId` — null for `super_admin`
- `status` — `'active' | 'inactive'`
- `employeeRef` — ObjectId ref to `Employee`, only set for `asset_manager` and `employee` roles created via `createOrgUser`.

No index on `email` is defined explicitly in the schema code reviewed — login does a `findOne({ email })` global scan. Worth noting.

---

## Known Limitations / Things Worth Knowing

- **No refresh token rotation.** The same refresh token is reused until its 7-day expiry. If it's stolen, there's no mechanism to invalidate it short of changing `JWT_REFRESH_SECRET`.
- **No token denylist/blocklist.** Logout only clears cookies client-side. A valid token extracted from network traffic before logout remains usable until expiry.
- **`sameSite: 'lax'` not `'strict'`** — the comments in `setAuthCookies` say "Blocks CSRF" but `lax` only blocks cross-site requests that change state via top-level navigations. It does not fully prevent CSRF in all scenarios.
- **`secure: isProd`** — cookies are NOT marked secure in development. If someone is running the backend on a non-localhost HTTP URL in a non-production `NODE_ENV`, tokens would be sent over plain HTTP.
- **The `login()` call in `AuthContext.jsx` does not pass `credentials: 'include'`** — it doesn't need to (the cookies are being set, not read), but it's worth noting the inconsistency with `logout()` which does pass it.
- **User metadata in `localStorage`** — `id`, `email`, `role`, `organizationId` are stored in `localStorage`. This is not a security risk for the tokens themselves, but a user could modify their `localStorage` role. The backend enforces roles via the database, so this would have no effect on actual access — but it would affect what the frontend renders.

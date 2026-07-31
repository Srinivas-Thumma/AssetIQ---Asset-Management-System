# 04. AssetIQ — Authentication & Security Architecture

## Authentication Protocol & Token Lifecycle
AssetIQ uses a dual-token JWT authentication architecture stored in `HttpOnly` `SameSite` cookies to protect against XSS token theft and CSRF attacks.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Client as React Client (AuthContext)
    participant Express as Express Router
    participant AuthMW as auth.middleware.js
    participant DB as MongoDB

    User->>Client: Enter Email & Password
    Client->>Express: POST /api/v1/auth/login { email, password }
    Express->>DB: User.findOne({ email }).select('+passwordHash')
    DB-->>Express: Return User & Bcrypt Hash
    Express->>Express: bcrypt.compare(password, passwordHash)
    Express->>Express: Generate accessToken (15m) & refreshToken (7d)
    Express-->>Client: Set HttpOnly Cookie (accessToken) & Return Profile JSON
    Client->>Client: Store user profile in AuthContext

    Note over Client,Express: Authenticated Request Pipeline
    Client->>Express: GET /api/v1/assets (Cookie attached by browser)
    Express->>AuthMW: protect middleware extracts token
    AuthMW->>AuthMW: verify JWT signature
    AuthMW->>DB: User.findById(decoded.id)
    DB-->>AuthMW: Hydrate req.user & req.orgId
    AuthMW-->>Express: Continue to controller

    Note over Client,Express: Token Expiration & Silent Refresh
    Client->>Express: GET /api/v1/assets (Expired Access Token)
    Express-->>Client: 401 Unauthorized Response
    Client->>Express: POST /api/v1/auth/refresh
    Express->>Express: Verify refresh token cookie
    Express-->>Client: Set fresh accessToken HttpOnly Cookie
    Client->>Express: Retry original request
```

---

## Security & Authorization Middlewares

### 1. `protect` Middleware (`src/middlewares/auth.middleware.js`)
- Extracts JWT from `accessToken` HTTP-only cookie or `Authorization: Bearer <token>` header.
- Verifies signature against `JWT_ACCESS_SECRET`.
- Confirms user account status is `active`.
- Attaches `req.user` and `req.orgId` to the request object.

### 2. `tenantScope` Middleware (`src/middlewares/tenant.middleware.js`)
- Reads `req.user.organizationId`.
- Invokes `runWithTenant(orgId, async () => next())` to establish thread-local tenant tracking via `AsyncLocalStorage`.

### 3. `requireRole` Middleware (`src/middlewares/rbac.middleware.js`)
- Enforces Role-Based Access Control (RBAC).
- Accepts allowed roles (`requireRole('org_admin', 'asset_manager')`).
- Compares `req.user.role` against authorized list, returning `403 Forbidden` if unauthorized.

---

## Password Hashing & Encryption
- Passwords are hashed using `bcryptjs` with a cost factor of 10 salt rounds prior to persistence in MongoDB.
- Mongoose schema marks `passwordHash` with `select: false` so hashes are never accidentally returned in query results unless explicitly selected (`.select('+passwordHash')`).

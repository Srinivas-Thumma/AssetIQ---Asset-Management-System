# 06. AssetIQ — Complete Authentication & Security Guide

## 1. Authentication Strategy & Token Mechanics (The 10 Master Questions)

### A. Dual-Token Architecture (`accessToken` + `refreshToken`)
1. **What is it?** A security model combining short-lived Access Tokens (15 minutes) and long-lived Refresh Tokens (7 days) signed with JSON Web Tokens (JWT).
2. **Why is it needed?** Limits the exposure window if an access token is compromised while providing a seamless user session without requiring frequent re-logins.
3. **Why was this approach chosen?** Offers optimal security compared to static long-lived tokens while enabling instant token revocation.
4. **What problem does it solve?** Solves session theft and user friction by silently renewing access tokens in the background via `AuthContext.jsx`.
5. **What would happen if this didn't exist?** Users would either be forced to log in every 15 minutes or face security vulnerabilities from non-expiring tokens.
6. **How does it interact with the rest of the system?** Tokens are issued by `auth.controller.js`, stored in HTTP-only cookies, verified by `auth.middleware.js`, and refreshed automatically by `AuthContext.jsx`.
7. **Advantages:** High security, zero client-side token management logic, immune to XSS token theft when stored in `HttpOnly` cookies.
8. **Disadvantages:** Requires maintaining a refresh token endpoint and cookie handling logic.
9. **Common Mistakes:** Storing JWT tokens in `localStorage` or `sessionStorage` (making them vulnerable to XSS scripts).
10. **Interview Question:** *Why store JWT tokens in `HttpOnly` cookies instead of `localStorage`?*  
    *Answer:* `localStorage` is accessible to any client-side JavaScript script executing on the page (vulnerable to XSS attacks). `HttpOnly` cookies are isolated by the browser engine and cannot be read or stolen by JavaScript.

---

## 2. Authentication Sequence Diagrams

### A. Login & Token Cookie Set Flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Client as React Client (AuthContext)
    participant Express as Express Gateway
    participant AuthCtrl as auth.controller.js
    participant DB as MongoDB

    User->>Client: Enter Email & Password
    Client->>Express: POST /api/v1/auth/login { email, password }
    Express->>AuthCtrl: Validate schema & query User
    AuthCtrl->>DB: User.findOne({ email }).select('+passwordHash')
    DB-->>AuthCtrl: User Record & Bcrypt Hash
    AuthCtrl->>AuthCtrl: bcrypt.compare(password, passwordHash)
    AuthCtrl->>AuthCtrl: Sign accessToken (15m) & refreshToken (7d)
    AuthCtrl-->>Client: Set HttpOnly Cookie (accessToken) & Return Profile JSON
    Client->>Client: Store user profile in AuthContext state
```

---

### B. Automatic Silent Token Refresh Flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Client as React Client (AuthContext)
    participant Express as Express Gateway
    participant AuthMW as auth.middleware.js
    participant AuthCtrl as auth.controller.js

    User->>Client: Perform Action (e.g. Fetch Assets)
    Client->>Express: GET /api/v1/assets (Expired accessToken Cookie)
    Express->>AuthMW: protect middleware detects expired JWT
    AuthMW-->>Client: 401 Unauthorized Response
    Client->>Client: apiCall catches 401 & pauses request queue
    Client->>Express: POST /api/v1/auth/refresh
    Express->>AuthCtrl: Verify refresh token cookie
    AuthCtrl->>AuthCtrl: Generate fresh accessToken (15m)
    AuthCtrl-->>Client: Set fresh HttpOnly Cookie (accessToken)
    Client->>Express: Retry original request GET /api/v1/assets
    Express-->>Client: 200 OK Response Data
```

---

## 3. Role-Based Access Control (RBAC) Matrix

| User Role | Managed Scope | Permitted API Endpoints |
| :--- | :--- | :--- |
| `super_admin` | Global SaaS Platform | `/api/v1/admin/*` (Tenant provisioning, subscription plans, platform tickets, system banners) |
| `org_admin` | Tenant Workspace | `/api/v1/lookups/*`, `/api/v1/locations/*`, `/api/v1/offboarding/*`, `/api/v1/assets/*`, `/api/v1/maintenance/*` |
| `asset_manager` | Fleet Inventory & Repairs | `/api/v1/assets/*` (Register, Assign, Mark Damaged), `/api/v1/maintenance/*` (Schedule, Complete) |
| `employee` | Personal Assigned Custody | Read assigned assets, submit servicing requests, participate in ticket chats |

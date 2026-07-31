# 12. AssetIQ — Complete Codebase Trace & Execution Flow

## End-to-End Walkthrough: User Authentication to Dashboard Render

```
1. User Clicks Login
      │
      ▼
2. Login.jsx (React View)
      │ Submits form data: { email: 'orgadmin1@test.com', password: 'password123' }
      ▼
3. AuthContext.jsx
      │ Calls login(email, password) -> apiCall('/api/v1/auth/login', { method: 'POST', body: ... })
      ▼
4. Express Server Gateway (server.js / app.js)
      │ Request hits http://localhost:5000/api/v1/auth/login
      ▼
5. Middleware Pipeline
      │ cors() -> cookieParser() -> express.json()
      ▼
6. Auth Router (auth.route.js)
      │ Maps POST /login to login controller handler
      ▼
7. Auth Controller (auth.controller.js)
      │ Validates Zod loginSchema -> User.findOne({ email }).select('+passwordHash')
      ▼
8. Database Layer (User.js / MongoDB)
      │ Queries MongoDB `users` collection -> Returns user document & bcrypt hash
      ▼
9. Password Verification & Token Signing (auth.controller.js)
      │ bcrypt.compare(password, passwordHash) -> Returns true
      │ Signs accessToken (15m) & refreshToken (7d)
      ▼
10. HTTP Response Dispatch
      │ Sets HttpOnly Cookie: accessToken=...
      │ Returns JSON: sendResponse(res, 200, true, 'Login successful', { user })
      ▼
11. React State Hydration (AuthContext.jsx)
      │ Updates state: setUser(user), setLoading(false)
      ▼
12. App Navigation & Routing (App.jsx)
      │ App.jsx detects user role ('org_admin') -> Renders App layout with Dashboard.jsx
      ▼
13. Dashboard Mounting & Metric Fetch (Dashboard.jsx)
      │ Fires apiCall('/api/v1/reports/asset-summary')
      ▼
14. Authenticated Request Pipeline
      │ protect middleware verifies JWT cookie -> tenantScope initializes AsyncLocalStorage
      │ report.controller.js calculates KPI aggregations -> Returns summary metrics
      ▼
15. Dashboard Rendering
      │ Dashboard.jsx renders KPI cards, health score charts, & active ticket lists
```

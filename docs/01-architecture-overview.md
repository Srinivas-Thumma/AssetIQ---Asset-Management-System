# 01 — Architecture Overview

## Overview
AssetIQ is a multi-tenant SaaS application split into two independent processes: a Node.js/Express REST API backend (`assetiq-backend`) and a React SPA frontend (`assetiq-frontend`). During local development the frontend Vite dev server proxies all `/api` traffic to the backend so both run under the same origin and cookies work without CORS issues.

---

## Files Involved

| File | Role |
|---|---|
| `assetiq-backend/server.js` | Entry point. Orchestrates startup sequence: DB connect → seed → jobs → HTTP server → Socket.IO. |
| `assetiq-backend/src/app.js` | Creates the Express app, registers global middleware, mounts all route prefixes, registers the error handler. |
| `assetiq-backend/src/config/db.js` | Mongoose `connectDB()` — called once at startup. |
| `assetiq-backend/src/config/socket.js` | `initSocket(server)` — attaches Socket.IO to the HTTP server. |
| `assetiq-backend/src/jobs/warrantyAlert.job.js` | `startWarrantyJob()` — node-cron daily at 01:00. |
| `assetiq-backend/src/jobs/healthScore.job.js` | `startHealthScoreJob()` — node-cron daily (also registered at `'* 0 * * *'` — see Known Limitations). |
| `assetiq-backend/src/middlewares/error.middleware.js` | Global Express error handler, last middleware in `app.js`. |
| `assetiq-frontend/vite.config.js` | Configures the Vite dev server proxy. |

---

## Boot Sequence (`server.js`)

```
node server.js
  │
  ├─ 1. connectDB()             ← Mongoose connects to MongoDB
  ├─ 2. seedGlobalData()        ← Creates Free/Pro Plans and default super_admin if missing
  ├─ 3. startWarrantyJob()      ← Registers cron (does NOT run immediately)
  ├─ 4. startHealthScoreJob()   ← Registers cron (does NOT run immediately)
  ├─ 5. http.createServer(app)  ← Wraps Express in a raw Node HTTP server
  ├─ 6. initSocket(server)      ← Attaches Socket.IO to that HTTP server
  └─ 7. server.listen(PORT)     ← Starts accepting connections
```

The `app` object (Express) is built separately in `src/app.js` and imported into `server.js`. This separation means the app can be imported in tests without starting the HTTP server.

---

## Express Middleware Chain (`app.js`)

Every request passes through these in order before reaching a route handler:

```
1. cors()          — allows http://localhost:5173 with credentials:true
2. cookieParser()  — parses Cookie header into req.cookies (needed by protect middleware)
3. express.json()  — parses JSON request bodies into req.body
4. morgan('dev')   — logs method, path, status, response time to stdout
   ↓
[Route-specific middleware applied per router]
   └─ protect       → verifies accessToken cookie, attaches req.user / req.orgId
   └─ tenantScope   → wraps downstream handlers in AsyncLocalStorage tenant context
   └─ requireRole() → checks req.user.role against allowed list
   ↓
Controller function
   ↓
5. errorHandler    — catches any error thrown/passed to next(), returns JSON
```

---

## Layered Architecture Pattern

```
HTTP Request
    │
    ▼
Route file (e.g. asset.route.js)
    │  declares HTTP verb, path, and which middlewares/controllers handle it
    ▼
Middleware chain
    │  protect → tenantScope → requireRole
    ▼
Controller (e.g. asset.controller.js)
    │  validates input, calls models/services, calls sendResponse()
    ▼
Mongoose Model (e.g. Asset.js)
    │  schema definition + tenantScopePlugin + indexes
    ▼
MongoDB (via Mongoose)
```

Services (`ai.service.js`, `qr.service.js`) are called by controllers for logic that doesn't fit cleanly in a controller (Ollama HTTP calls, QR generation).

---

## Frontend ↔ Backend Connection (Local Development)

`assetiq-frontend/vite.config.js`:
```js
proxy: {
  '/api': {
    target: 'http://127.0.0.1:5000',
    changeOrigin: true,
    secure: false,
  }
}
```

Any fetch to `/api/v1/...` from the React app (running on port 5173) is forwarded by Vite's dev server to the Express backend on port 5000. Because the request appears to come from the same origin (5173), the browser sends `HttpOnly` cookies automatically and CORS does not block the response.

**Note:** The Socket.IO connection in `SocketContext.jsx` does NOT go through the Vite proxy. It connects directly to `http://localhost:5000` (hardcoded when `window.location.hostname` is localhost). This works because the backend `socket.js` has its own CORS config that explicitly allows `http://localhost:5173`.

---

## Known Limitations / Things Worth Knowing

- **Both cron jobs use `'* 0 * * *'`** — This is a valid cron expression but it runs every minute of the midnight hour (00:00, 00:01, 00:02 … 00:59), not just once at 01:00 AM as the console log messages claim. The intended expression for "once daily at 1 AM" would be `'0 1 * * *'`. Worth verifying this is intentional or a bug.
- **`seedGlobalData()` runs on every server start** — it uses `findOne` checks before creating, so it's idempotent. No data is duplicated. But it does hit the database on every boot.
- **No graceful shutdown handling** — `server.js` has no `SIGTERM`/`SIGINT` handler to close the DB connection or drain in-flight requests cleanly.
- **Health endpoint checks Ollama with a 1.5s timeout** — if Ollama is slow to respond, the `/health` endpoint will report `"unreachable"` even if Ollama is actually functional.

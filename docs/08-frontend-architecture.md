# 08 — Frontend Architecture

## Overview
The frontend is a React 18 SPA with no routing library (confirmed: no react-router-dom import in `App.jsx` or `package.json`). Routing is handled with the native History API (`window.history.pushState`) and a `popstate` listener for browser back/forward. All authenticated API calls go through a central `apiCall()` wrapper in `AuthContext` that handles cookie-based auth and silent token refresh automatically.

---

## Files Involved

| File | Role |
|---|---|
| `src/App.jsx` | Root component: custom router state, view switcher, notification listener, session guards. |
| `src/context/AuthContext.jsx` | Auth state, `login()`, `register()`, `logout()`, `refreshAccessToken()`, `apiCall()`. |
| `src/context/SocketContext.jsx` | Socket.IO client lifecycle — connects when `user` is set, disconnects on logout. |
| `vite.config.js` | Dev server proxy: all `/api` requests forwarded to `http://127.0.0.1:5000`. |
| `src/views/*` | Individual page views (Assets, Dashboard, Maintenance, etc.) — each is a self-contained component. |

---

## Custom History-API Router (Confirmed — No react-router-dom)

There is no `react-router-dom` import anywhere in `App.jsx`. Routing is implemented manually:

```js
// State tracking current path
const [currentPath, setCurrentPath] = useState(window.location.pathname);

// Navigation function — pushes to browser history and updates state
const navigate = (path) => {
  window.history.pushState({}, '', path);
  setCurrentPath(path);
};

// Syncs state when user clicks browser Back/Forward
useEffect(() => {
  const handlePopState = () => setCurrentPath(window.location.pathname);
  window.addEventListener('popstate', handlePopState);
  return () => window.removeEventListener('popstate', handlePopState);
}, []);
```

Path parsing:
```js
// Extracts tab from path: '/dashboard/assets' → 'assets'
const getTabFromPath = (path) => {
  if (!path.startsWith('/dashboard')) return 'dashboard';
  const segment = path.replace(/^\/dashboard\/?/, '').split('/')[0];
  const validTabs = ['dashboard', 'assets', 'locations', 'maintenance',
                     'warranties', 'reports', 'setup', 'superadmin'];
  return validTabs.includes(segment) ? segment : 'dashboard';
};
```

View rendering is a `switch` statement on `activeTab`:
```js
const renderActiveView = () => {
  switch (activeTab) {
    case 'assets': return <Assets />;
    case 'maintenance': return <Maintenance />;
    // ...
  }
};
```

All views are mounted/unmounted when `activeTab` changes — no persistent view state across tab switches unless a view stores state in a parent.

---

## AuthContext: Token Handling & Auto-Retry

The context stores only non-sensitive metadata in state (`user` object: `id`, `email`, `role`, `organizationId`). This is also written to `localStorage` so it persists across page refreshes.

On app load:
```js
useEffect(() => {
  const savedUser = localStorage.getItem('user');
  if (savedUser) {
    try { setUser(JSON.parse(savedUser)); }
    catch (e) { localStorage.clear(); }
  }
  setLoading(false);
}, []);
```

The tokens themselves live only in `HttpOnly` cookies and are not accessible to JavaScript.

### `apiCall(url, options)` — The Central Fetch Wrapper

Every view that needs to make an authenticated request calls `apiCall()` from `useAuth()`:

```js
const apiCall = async (url, options = {}) => {
  const headers = { 'Content-Type': 'application/json', ...options.headers };

  let response = await fetch(url, { ...options, headers, credentials: 'include' });

  if (response.status === 401) {
    const refreshSuccess = await refreshAccessToken();
    if (refreshSuccess) {
      response = await fetch(url, { ...options, headers, credentials: 'include' });
    }
    // If refresh fails, logout() was called inside refreshAccessToken() — user gets redirected
  }

  return await response.json();
};
```

Key behaviors:
- `credentials: 'include'` ensures the `accessToken` and `refreshToken` cookies are sent with every request.
- On 401: tries refresh once, retries original request once. Does not retry more than once.
- Does not throw on non-2xx responses (other than the 401 handling). It returns the parsed JSON regardless of status. Views must check `res.success` themselves.
- Does not handle network failures (fetch throwing) — no try/catch in `apiCall` itself. Views that call `apiCall` in a try/catch will catch network errors there.

### `refreshAccessToken()`

```js
const refreshAccessToken = async () => {
  const response = await fetch('/api/v1/auth/refresh', {
    method: 'POST',
    credentials: 'include',
  });
  const resData = await response.json();
  if (!resData.success) throw new Error('Refresh failed');
  return true;
};
```

If this throws (expired refresh token or network error), the catch in `apiCall`'s caller is NOT triggered — `refreshAccessToken`'s catch is inside `AuthContext` itself, which calls `logout()`. The `apiCall` then proceeds with the second fetch using the now-stale cookies, which will also 401 — but that response is returned to the caller as-is.

---

## SocketContext: Connection Lifecycle

```js
// SocketContext.jsx
useEffect(() => {
  if (user) {
    // Connect when user is set
    const socketInstance = io('http://localhost:5000', {
      withCredentials: true,           // sends cookies
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
    });
    setSocket(socketInstance);
    return () => { socketInstance.disconnect(); };  // cleanup on unmount or user change
  } else {
    // Disconnect immediately on logout
    if (socketRef.current) socketRef.current.disconnect();
  }
}, [user]);  // re-runs whenever user state changes
```

The socket URL is derived from `window.location.hostname`:
- `localhost` or `127.0.0.1` → connects to `http://<hostname>:5000` directly (NOT through Vite proxy)
- Any other hostname → uses `window.location.origin` (same origin)

The socket has `reconnectionAttempts: 20` with `reconnectionDelay: 1000ms`. After 20 failed reconnection attempts, it stops trying.

`connect_error` events suppress the error log if the message contains `'No token provided'` or `'Authentication failed'` — this suppresses noise during logout or before auth is established.

Exposed via context: `{ socket, isConnected }`. Views import `useSocket()` to get these.

---

## How Views Fetch Data

Every view follows the same pattern (no dedicated data-fetching library — no React Query, no SWR, no Redux):

```js
// Typical view pattern
const { apiCall } = useAuth();
const [data, setData] = useState([]);

const fetchData = async () => {
  try {
    const res = await apiCall('/api/v1/some-endpoint');
    if (res.success) setData(res.data);
  } catch (err) {
    console.error(err);
  }
};

useEffect(() => {
  fetchData();
}, []);
```

There is no global loading/error state management — each view manages its own `loading` and error state locally.

---

## Session Routing Guards

```js
useEffect(() => {
  if (!loading) {
    if (user) {
      if (['/', '/login', '/register'].includes(currentPath)) navigate('/dashboard');
    } else {
      if (currentPath.startsWith('/dashboard')) navigate('/login');
    }
  }
}, [user, loading, currentPath]);
```

This runs on every path change and auth state change. `loading` starts as `true` during the `localStorage` check on mount, preventing premature redirects.

---

## Provider Tree

```
<AuthProvider>        ← manages user state + apiCall
  <SocketProvider>    ← manages socket (depends on user from AuthProvider)
    <AppContent />    ← router + views + notification listener
  </SocketProvider>
</AuthProvider>
```

`SocketProvider` depends on `useAuth()` internally — it reads `user` to decide when to connect/disconnect. This means `AuthProvider` must be the outer wrapper.

---

## Known Limitations / Things Worth Knowing

- **No routing library** — deep-linking works because `pushState` updates the URL, and `popstate` handles back/forward. However, if the user directly navigates to `/dashboard/assets` by typing in the address bar (hard navigation), the Vite dev server serves `index.html` and the React app reads `window.location.pathname` on load to restore the correct view. This works in dev. In production (with a static file server), you'd need the server configured to serve `index.html` for all paths.
- **`apiCall` returns parsed JSON regardless of HTTP status** — a 404 or 500 response is returned as a plain object. Views must check `res.success`. There is no centralized error notification for failed API calls.
- **`apiCall` has no timeout** — a hung server request will keep the UI waiting indefinitely with no cancellation mechanism.
- **Notifications also polled every 2 minutes** — even with WebSocket live delivery, `App.jsx` sets up a `setInterval(fetchNotifications, 120000)` as a fallback. This means up to 2 minutes of delay in edge cases where the socket delivers the notification but state doesn't update, and means one REST call every 2 minutes while any user is logged in.
- **No state persistence across tab switches** — switching tabs unmounts and remounts components. Any unsaved form state or scroll position in a view is lost when navigating away.
- **All views are loaded at startup** — there is no code-splitting or lazy loading of views. All view components are imported at the top of `App.jsx` and included in the initial bundle.

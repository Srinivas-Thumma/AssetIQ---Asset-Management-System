# 07 — Real-Time Notifications and Chat

## Overview
AssetIQ uses Socket.IO for two real-time features: a per-ticket maintenance chat and a push notification bell. Both run over the same WebSocket connection. Notifications are also persisted to MongoDB and have a TTL auto-delete index. Chat messages are persisted to a separate collection. Chat room access is permission-checked at join time AND re-verified on every message event.

---

## Files Involved

| File | Role |
|---|---|
| `src/config/socket.js` | Entire Socket.IO server setup: handshake auth, room logic, chat handlers, notification dispatch. |
| `src/models/Notification.js` | `notifications` collection schema + TTL index. |
| `src/models/MaintenanceMessage.js` | `maintenancemessages` collection schema. |
| `src/controllers/maintenance.controller.js` | REST endpoints for chat messages (`getMaintenanceMessages`, `createMaintenanceMessage`). |
| `src/controllers/notification.controller.js` | REST endpoints for notification CRUD (`GET`, `PUT` mark-read). |
| `src/jobs/warrantyAlert.job.js` | Creates `Notification` documents and emits `notification:new` via WebSocket. |
| `assetiq-frontend/src/context/SocketContext.jsx` | Client-side Socket.IO connection lifecycle. |
| `assetiq-frontend/src/App.jsx` | Listens for `notification:new` events, updates notification state. |

---

## Socket.IO Connection & Authentication Handshake

Socket.IO connections happen outside the Express middleware chain. The handshake is authenticated separately:

```js
// socket.js — io.use() middleware
const rawCookieHeader = socket.handshake.headers?.cookie || '';
const parsedCookies = cookie.parse(rawCookieHeader);
const token = parsedCookies.accessToken || socket.handshake.auth?.token;

const user = await verifyTokenAndGetUser(token);  // same function as HTTP protect middleware
socket.user = user;
socket.orgId = user.organizationId?.toString() || null;
```

`verifyTokenAndGetUser()` does the same thing as HTTP `protect`: JWT verify + DB user lookup + active status check. If it throws, the socket connection is rejected with an error.

The `cookie` package (npm) is used to parse the raw cookie string — Express's `cookieParser` only runs in the HTTP pipeline, not on WebSocket handshakes.

After authentication, sockets also accept a fallback token via `socket.handshake.auth?.token` for cases where cookies aren't available (e.g., the verification scripts pass tokens this way).

---

## Room Architecture

On every successful connection, two rooms are auto-joined (server-side, not client-controlled):

```js
socket.join(`user:${userIdStr}`);       // always joined
if (socket.orgId) {
  socket.join(`org:${socket.orgId}`);   // joined if user has an org
}
```

A third room type exists but is joined explicitly by the client:
```js
// Client emits:
socket.emit('chat:join', { requestId: '...' })
// Server joins: 'chat:request:<requestId>'
```

Room naming:
- `user:<userId>` — personal notifications
- `org:<orgId>` — org-wide broadcasts (not currently used for anything in the codebase beyond the warranty cron job's `io.to('user:...')` calls, which target user rooms, not org rooms)
- `chat:request:<requestId>` — per-ticket chat

---

## What Creates a `Notification` Document

There are exactly two sources:

### Source 1: Warranty Cron Job (`warrantyAlert.job.js`)
Triggered when a warranty is expiring within 30 days and `alertSent === false`:
```js
Notification.create({
  organizationId: warranty.organizationId,
  userId: admin._id,         // one per org_admin and asset_manager
  message: 'Warranty for asset "..." expires on ...',
  type: 'warranty_expiring',
  relatedId: warranty._id
})
// then:
io.to(`user:${admin._id.toString()}`).emit('notification:new', notification)
```

### Source 2: Chat Message Sent via WebSocket (`socket.js`)
Triggered when any user sends a `chat:message` event:
```js
Notification.create({
  organizationId: request.organizationId,
  userId: recipient._id,
  message: `💬 New ticket message from ${senderEmailPrefix}: "..."`,
  type: 'chat_message',
  relatedId: requestId,
  read: false
})
io.to(`user:${recipient._id.toString()}`).emit('notification:new', notifDoc)
```
Recipients are: all `org_admin` and `asset_manager` users in the org (minus the sender) + the ticket creator (`raisedBy`) if they're not the sender.

**Note:** The REST `createMaintenanceMessage()` in `maintenance.controller.js` also broadcasts to the chat room (`io.to('chat:request:...')`) but does NOT create `Notification` documents. Only the WebSocket `chat:message` handler creates notifications.

---

## Notification Collection Schema

```
organizationId  ObjectId  required, indexed  (type is ObjectId here, not String like tenantScopePlugin adds — potential type mismatch)
userId          ObjectId  required, indexed
message         String    required
type            String    enum: ['warranty_expiring', 'maintenance_due', 'chat_message']
read            Boolean   default: false, indexed
relatedId       ObjectId  default: null
createdAt       Date      auto-timestamp
```

**TTL Index:**
```js
notificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 2592000, partialFilterExpression: { read: true } }
)
```
MongoDB automatically deletes notification documents 30 days after `createdAt` **only when `read: true`**. Unread notifications are never automatically deleted.

---

## The Two Unread Indicators

### 1. Bell Icon (Header Notifications)
- **Source:** `notifications` collection, all documents where `read: false`.
- **How populated:** `App.jsx` calls `GET /api/v1/notifications` on mount and every 2 minutes (polling interval), and also listens for `socket.on('notification:new', ...)` to prepend new notifications to state in real time.
- **How cleared:** `PUT /api/v1/notifications/:id` marks one as read. `PUT /api/v1/notifications` (no ID) marks all as read. Both update `read: true` in MongoDB. The frontend updates state locally without re-fetching.

### 2. Maintenance Tab Dot
This is not visible in the code reviewed. The `Maintenance.jsx` view was not read. The `maintenancerequests` or `notifications` collection might be queried there for unread indicators, but this cannot be confirmed from the files reviewed.

---

## Chat Room Join and Permission Check

### On `chat:join` event:
1. Client emits `socket.emit('chat:join', { requestId })`.
2. Server calls `checkChatAccessPermission(socket, requestId)`.
3. `checkChatAccessPermission`:
   - Fetches `MaintenanceRequest` scoped to `socket.orgId` (or globally for super_admin with no orgId).
   - Returns 404-style unauthorized if not found (cross-tenant protection).
   - `super_admin`, `org_admin`, `asset_manager` → authorized immediately.
   - `employee` → checks `asset.assignedTo === socket.user.employeeRef` OR `request.raisedBy === socket.user._id`.
4. If authorized: `socket.join('chat:request:<requestId>')`, emits `chat:joined` back to client.
5. If denied: emits `chat:error` back to client, does NOT join the room.

### On `chat:message` event:
```js
// ALWAYS re-verify authorization on every message event (comment from source code)
const { authorized, reason, request } = await checkChatAccessPermission(socket, requestId);
```
The same check runs again. A user whose permissions changed after joining (e.g., employee unassigned from the asset) would be blocked on their next message even if they're still in the room.

After authorization:
1. `MaintenanceMessage.create({ organizationId, requestId, senderId, senderName, senderRole, message })`.
2. `io.to('chat:request:<requestId>').emit('chat:message', newMessage)` — broadcasts to ALL clients in the room including sender.
3. Notification creation loop (described above).

---

## Chat Message Collection Schema (`maintenancemessages`)

```
organizationId  String    required (tenantScopePlugin)
requestId       ObjectId  ref MaintenanceRequest, required
senderId        ObjectId  ref User, required
senderName      String    (email prefix, e.g. "john.doe")
senderRole      String
message         String    required
createdAt       Date      auto-timestamp
```

No explicit index on `{ requestId: 1, createdAt: 1 }` was observed in the `MaintenanceMessage.js` file (not directly read — inferred from the REST query `.find({ requestId: id }).sort({ createdAt: 1 })`). If there's no compound index, history fetching will be a full collection scan on large datasets.

---

## Known Limitations / Things Worth Knowing

- **`maintenance_due` notification type exists in the schema enum but is never created** — `warrantyAlert.job.js` creates `warranty_expiring`, and `socket.js` creates `chat_message`. Nothing in the reviewed code creates `maintenance_due` notifications.
- **REST `createMaintenanceMessage` does NOT create Notification documents** — only the WebSocket path does. If a user sends a message via the REST endpoint (not through the WebSocket), recipients get no bell notification. Both paths persist messages, but only the WebSocket path notifies.
- **`org` room is joined but never targeted** — every user joins `org:<orgId>` on connect, but no code in `socket.js` or `warrantyAlert.job.js` emits to `org:*` rooms. All emissions target `user:*` rooms. The org room is unused infrastructure.
- **Notification documents for chat are created per-recipient in a loop** — if an org has many admins, a single chat message creates many notification documents. No batching.
- **The Maintenance tab dot indicator could not be confirmed** — `Maintenance.jsx` was not reviewed. The claim about a Maintenance tab unread indicator exists in the UI but its implementation is unknown from reviewed files.
- **`organizationId` type mismatch** — `Notification.js` declares `organizationId` as `ObjectId`, but `tenantScopePlugin` adds it as `String`. Both are applied to Notification (plugin is at line 46). This dual-type declaration for the same field could cause Mongoose to behave inconsistently.

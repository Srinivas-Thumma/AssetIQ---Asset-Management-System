# 05 — Asset Lifecycle

## Overview
An asset moves through a defined set of statuses that reflect its real-world state. Status transitions are triggered by specific controller actions — some are explicit (user sets status), some are automatic (damaged → maintenance ticket auto-created). A separate hard-delete safety guard runs parallel existence checks before allowing permanent deletion.

---

## Files Involved

| File | Role |
|---|---|
| `src/models/Asset.js` | Schema with `status` enum and `ai` sub-document. |
| `src/controllers/asset.controller.js` | `createAsset`, `updateAsset`, `deleteAsset`, `assignAsset`, `returnAsset`. |
| `src/controllers/maintenance.controller.js` | `createMaintenanceRequest`, `updateMaintenanceRequest`, `completeMaintenance`, `deleteMaintenanceRequest`. |
| `src/models/AssetAssignment.js` | Audit log for custody assignments. |
| `src/models/MaintenanceRequest.js` | Ticket record. |
| `src/models/MaintenanceHistory.js` | Completed repair log. |
| `src/models/Warranty.js` | Warranty record. |

---

## Status Enum

```js
enum: ['available', 'assigned', 'under_maintenance', 'retired', 'damaged']
default: 'available'
```

---

## What Triggers Each Transition

| From | To | Trigger | Code Location |
|---|---|---|---|
| *(new)* | `available` | `createAsset()` sets `status: 'available'` unconditionally | `asset.controller.js` line 148 |
| `available` | `assigned` | `assignAsset()` — checks status is `available` first, then sets `assigned` | `asset.controller.js` line 292 |
| `assigned` | `available` | `returnAsset()` — checks status is `assigned`, sets `available`, closes open assignment log | `asset.controller.js` line 325-327 |
| `available` or `assigned` | `damaged` | `updateAsset()` called with `status: 'damaged'` in request body | `asset.controller.js` line 197-198 |
| `damaged` | `under_maintenance` | `updateMaintenanceRequest()` — when ticket status moves to `'assigned'` or `'in_progress'` AND `asset.status !== 'under_maintenance'` | `maintenance.controller.js` lines 95-100 |
| `available` | `under_maintenance` | `createMaintenanceRequest()` — sets `asset.status = 'under_maintenance'` immediately upon ticket creation (regardless of asset's previous status) | `maintenance.controller.js` line 52 |
| `under_maintenance` | `assigned` or `available` | `completeMaintenance()` — restores to `assigned` if `asset.assignedTo` exists, else `available` | `maintenance.controller.js` lines 150-154 |
| `under_maintenance` | `available` | `deleteMaintenanceRequest()` — if the deleted ticket was the only active ticket and asset is `under_maintenance`, resets to `available` | `maintenance.controller.js` lines 191-198 |
| any | `retired` | `deleteAsset()` called with `?mode=retire` query param | `asset.controller.js` lines 243-247 |

---

## Full Damaged → Maintenance → Complete Path

### Step 1: Mark Asset as Damaged
Request: `PUT /api/v1/assets/:id` with body `{ "status": "damaged" }`

1. `protect` + `tenantScope` + `requireRole('org_admin', 'super_admin', 'asset_manager')` run.
2. `updateAsset()` in `asset.controller.js`:
   - Finds asset by `req.params.id`.
   - Detects `status === 'damaged'` branch.
   - Sets `asset.status = 'damaged'`.
   - Queries `MaintenanceRequest.findOne({ assetId, status: { $in: ['open', 'in_progress', 'assigned'] } })`.
   - If no active ticket exists, creates one: `type: 'corrective'`, `priority: 'high'`, `status: 'open'`, `scheduledDate: new Date()`, `raisedBy: req.user._id`.
   - Saves asset.
3. Response: 200 with updated asset.

**Note:** The auto-created ticket does NOT set the asset to `under_maintenance` at this point. The asset stays `damaged`.

### Step 2: Work Begins (Ticket Status Updated)
Request: `PUT /api/v1/maintenance/:id` with body `{ "status": "assigned" }` or `{ "status": "in_progress" }`

1. `protect` + `tenantScope` + `requireRole('org_admin', 'super_admin', 'asset_manager')`.
2. `updateMaintenanceRequest()`:
   - Updates `request.status`.
   - Saves request.
   - Checks: `if (['assigned', 'in_progress'].includes(status))` — fetches linked asset.
   - If `asset.status !== 'under_maintenance'`, sets it to `'under_maintenance'` and saves.
3. This is the transition from `damaged` → `under_maintenance`. It requires an explicit ticket status update by an admin — it does NOT happen automatically just because a ticket exists.

### Step 3: Complete Maintenance
Request: `POST /api/v1/maintenance/:id/complete` with body `{ "cost": 150, "findings": "...", "actionsTaken": "..." }`

1. `protect` + `tenantScope` + `requireRole('org_admin', 'super_admin', 'asset_manager')`.
2. `completeMaintenance()`:
   - Validates all three body fields are present.
   - Sets `request.status = 'resolved'`, `request.completedDate = new Date()`.
   - Creates `MaintenanceHistory` record with `cost`, `findings`, `actionsTaken`, linked to both `assetId` and `requestId`.
   - Fetches linked asset.
   - Restores status: `asset.assignedTo ? 'assigned' : 'available'`.
   - Triggers `analyzeAssetHealth(asset, true)` (force recompute) and saves the new AI scores to `asset.ai`.
   - Saves asset.
3. Response: 200 with request, history, and `assetHealthScore`.

---

## Hard-Delete vs Retire

### Retire (Soft Delete): `DELETE /api/v1/assets/:id?mode=retire`
1. Finds asset.
2. Sets `asset.status = 'retired'`.
3. Saves. No records deleted. Asset remains in the collection.

### Hard Delete: `DELETE /api/v1/assets/:id` (no `mode` param)
1. Runs parallel safety checks via `Promise.all`:
   ```js
   MaintenanceRequest.exists({ assetId: asset._id })
   MaintenanceHistory.exists({ assetId: asset._id })
   Warranty.exists({ assetId: asset._id })
   AssetAssignment.exists({ assetId: asset._id })
   ```
2. If ANY of the four checks returns truthy → 400 error, deletion blocked.
3. If all return falsy (no records in any of those collections) → `asset.deleteOne()`.
4. No cascading delete of related records — because the guard blocks deletion if any exist.

---

## Where Data Is Stored

### Collection: `assets`
Key fields: `assetCode` (String), `name`, `categoryId`, `roomId`, `assignedTo` (ref Employee), `status` (enum), `purchaseDate`, `purchasePrice`, `vendorId`, `qrCode` (base64 data URL), `ai` (sub-document), `customValues` (Map).

Indexes (from `Asset.js`):
- `{ organizationId: 1, assetCode: 1 }` — unique compound (prevents duplicate codes per org)
- `{ organizationId: 1, status: 1 }` — speeds filtering by status per org
- `{ organizationId: 1, assignedTo: 1 }` — speeds lookup of assets assigned to a specific employee

### Collection: `maintenancerequests`
Fields: `assetId`, `raisedBy`, `type` (`corrective`/`preventive`), `priority`, `description`, `scheduledDate`, `status` (`open`/`assigned`/`in_progress`/`resolved`), `completedDate`.

### Collection: `maintenancehistories`
Fields: `assetId`, `requestId`, `date`, `cost`, `findings`, `actionsTaken`.

### Collection: `assetassignments`
Fields: `assetId`, `employeeId`, `assignedBy`, `assignedAt`, `returnedAt` (null while active).

---

## Known Limitations / Things Worth Knowing

- **`createMaintenanceRequest()` immediately sets asset to `under_maintenance`** — this means manually creating a new maintenance ticket (not via the "mark damaged" flow) bypasses the `damaged` status entirely and jumps straight to `under_maintenance`. Whether this is intentional is unclear.
- **The damaged → under_maintenance transition requires a manual ticket status update** — there is no automatic trigger. If a ticket exists at `open` status but no one changes it to `assigned`/`in_progress`, the asset stays `damaged` indefinitely.
- **`deleteMaintenanceRequest()` only resets to `available`** — when a ticket is deleted, the asset resets to `available` even if it had been `assigned` before the maintenance ticket was created. The pre-maintenance `assigned` status is not preserved.
- **`assignAsset()` checks `status !== 'available'`** — assets in `damaged`, `under_maintenance`, or `retired` status cannot be assigned. The error message includes the current status.
- **QR code is a base64 data URL stored as a String** — it's regenerated at asset creation and not updated subsequently. If the asset ID changes (it won't, but hypothetically) the QR link would break.

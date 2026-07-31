# 07. AssetIQ — Complete Database Reference & Sample Documents

## Collection Catalog & Sample Documents

### 1. `organizations` (`Organization.js`)
- **Purpose:** Stores tenant workspace accounts.
- **Fields:** `_id` (ObjectId), `name` (String), `code` (String), `planId` (ObjectId ref Plan), `status` (String), `createdAt` (Date).
- **Sample Document:**
  ```json
  {
    "_id": "6a607f38b61b9a8bae9c49e8",
    "name": "Acme Corporation",
    "code": "acme-corp",
    "planId": "6a607978b61b9a8bae9c4920",
    "status": "active",
    "createdAt": "2026-07-22T08:28:40.650Z"
  }
  ```

---

### 2. `users` (`User.js`)
- **Purpose:** Manages user authentication credentials and system roles.
- **Fields:** `_id` (ObjectId), `organizationId` (String/ObjectId), `email` (String), `passwordHash` (String, select: false), `role` (String: `super_admin`, `org_admin`, `asset_manager`, `employee`), `employeeRef` (ObjectId ref Employee).
- **Sample Document:**
  ```json
  {
    "_id": "6a607f38b61b9a8bae9c49eb",
    "organizationId": "6a607f38b61b9a8bae9c49e8",
    "email": "orgadmin1@test.com",
    "role": "org_admin",
    "employeeRef": null,
    "status": "active"
  }
  ```

---

### 3. `assets` (`Asset.js`)
- **Purpose:** Physical equipment inventory records and AI analytical telemetry.
- **Fields:** `_id` (ObjectId), `organizationId` (String), `assetCode` (String), `name` (String), `categoryId` (ObjectId ref Category), `roomId` (ObjectId ref Room), `vendorId` (ObjectId ref Vendor), `assignedTo` (ObjectId ref Employee), `purchasePrice` (Number), `purchaseDate` (Date), `status` (String: `available`, `assigned`, `damaged`, `under_maintenance`, `retired`), `ai` (Object).
- **Sample Document:**
  ```json
  {
    "_id": "6a61eff0ed1a95055efa6d63",
    "organizationId": "6a607f38b61b9a8bae9c49e8",
    "assetCode": "AST-LAP-001",
    "name": "MacBook Pro M3 Max",
    "categoryId": "6a608001b61b9a8bae9c4a01",
    "roomId": "6a608055b61b9a8bae9c4b12",
    "vendorId": "6a608012b61b9a8bae9c4a55",
    "assignedTo": "6a608099b61b9a8bae9c4c33",
    "purchasePrice": 3499.00,
    "purchaseDate": "2025-01-15T00:00:00.000Z",
    "status": "assigned",
    "ai": {
      "healthScore": 92,
      "failureRiskPercent": 8,
      "predictedNextMaintenanceDate": "2026-11-15T00:00:00.000Z",
      "remainingUsefulLifeMonths": 36,
      "lastAnalyzedAt": "2026-07-31T05:35:28.255Z"
    }
  }
  ```

---

### 4. `maintenancerequests` (`MaintenanceRequest.js`)
- **Purpose:** Active and historical servicing requests.
- **Fields:** `_id` (ObjectId), `organizationId` (String), `assetId` (ObjectId ref Asset), `raisedBy` (ObjectId ref User), `assignedTechnician` (ObjectId ref User), `type` (String: `corrective`, `preventive`), `priority` (String: `low`, `medium`, `high`, `critical`), `status` (String: `open`, `assigned`, `in_progress`, `resolved`), `description` (String).
- **Sample Document:**
  ```json
  {
    "_id": "6a62a110ed1a95055efa7b22",
    "organizationId": "6a607f38b61b9a8bae9c49e8",
    "assetId": "6a61eff0ed1a95055efa6d63",
    "raisedBy": "6a607f38b61b9a8bae9c49eb",
    "type": "corrective",
    "priority": "high",
    "status": "open",
    "description": "Auto-generated corrective maintenance request: Asset reported damaged (MacBook Pro M3 Max)."
  }
  ```

---

### 5. `assetassignments` (`AssetAssignment.js`)
- **Purpose:** Historical log of asset custody transfers.
- **Fields:** `_id`, `organizationId`, `assetId`, `employeeId`, `assignedBy`, `assignedAt`, `returnedAt`.
- **Sample Document:**
  ```json
  {
    "_id": "6a635001ed1a95055efa8c99",
    "organizationId": "6a607f38b61b9a8bae9c49e8",
    "assetId": "6a61eff0ed1a95055efa6d63",
    "employeeId": "6a608099b61b9a8bae9c4c33",
    "assignedBy": "6a607f38b61b9a8bae9c49eb",
    "assignedAt": "2026-02-01T10:00:00.000Z",
    "returnedAt": null
  }
  ```

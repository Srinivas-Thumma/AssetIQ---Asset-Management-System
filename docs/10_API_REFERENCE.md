# 10. AssetIQ — Complete REST API Reference Manual

## 1. Authentication Endpoints (`/api/v1/auth`)

### A. User Login (`POST /api/v1/auth/login`)
- **Purpose:** Authenticates user credentials, sets HTTP-only `accessToken` session cookie, and returns user profile.
- **Authentication Required:** No (Public).
- **Roles Allowed:** All.
- **Request Body:**
  ```json
  {
    "email": "orgadmin1@test.com",
    "password": "password123"
  }
  ```
- **Validation:** `loginSchema` Zod validation (valid email format, string password min 6 chars).
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "user": {
        "_id": "6a607f38b61b9a8bae9c49eb",
        "email": "orgadmin1@test.com",
        "role": "org_admin",
        "organizationId": "6a607f38b61b9a8bae9c49e8"
      }
    }
  }
  ```
- **Database Changes:** None.
- **Related Frontend Views:** [`Login.jsx`](file:///C:/Projects/AssetIQ/assetiq-frontend/src/views/Login.jsx).

---

## 2. Asset Registry Endpoints (`/api/v1/assets`)

### A. Register New Asset (`POST /api/v1/assets`)
- **Purpose:** Creates a new physical asset, generates a base64 QR code, and scopes it to the tenant organization.
- **Authentication Required:** Yes.
- **Roles Allowed:** `org_admin`, `asset_manager`.
- **Request Body:**
  ```json
  {
    "assetCode": "AST-LAP-009",
    "name": "ThinkPad P1 Gen 6",
    "categoryId": "6a608001b61b9a8bae9c4a01",
    "purchasePrice": 2800,
    "purchaseDate": "2025-05-10"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Asset created successfully",
    "data": {
      "_id": "6a649001ed1a95055efab001",
      "assetCode": "AST-LAP-009",
      "name": "ThinkPad P1 Gen 6",
      "status": "available"
    }
  }
  ```
- **Database Changes:** Inserts document into `assets` collection with `organizationId` auto-populated.
- **Related Frontend Views:** [`Assets.jsx`](file:///C:/Projects/AssetIQ/assetiq-frontend/src/views/Assets.jsx).

### B. Update Asset / Mark Damaged (`PUT /api/v1/assets/:id`)
- **Purpose:** Updates asset properties. Setting `status: 'damaged'` keeps asset status as `'damaged'` and auto-creates an open corrective `MaintenanceRequest`.
- **Authentication Required:** Yes.
- **Roles Allowed:** `org_admin`, `asset_manager`.
- **Request Body:** `{ "status": "damaged" }`
- **Response (200 OK):** Returns updated asset object.
- **Database Changes:** Updates `assets` collection document; creates `maintenancerequests` document if damaged.
- **Related Frontend Views:** [`Assets.jsx`](file:///C:/Projects/AssetIQ/assetiq-frontend/src/views/Assets.jsx).

---

## 3. Offboarding Endpoints (`/api/v1/offboarding`)

### A. Return All Employee Assets (`POST /api/v1/offboarding/:employeeId/return-all`)
- **Purpose:** Unassigns all custody assets assigned to an exiting employee, returning them to `'available'` stock.
- **Authentication Required:** Yes.
- **Roles Allowed:** `org_admin`.
- **Response (200 OK):** `{ "success": true, "message": "Returned 2 assets to available stock" }`
- **Database Changes:** Sets `asset.assignedTo = null` and `asset.status = 'available'` across matching assets; updates `AssetAssignment` documents with `returnedAt`.
- **Related Frontend Modals:** [`OffboardingChecklistModal.jsx`](file:///C:/Projects/AssetIQ/assetiq-frontend/src/components/OffboardingChecklistModal.jsx).

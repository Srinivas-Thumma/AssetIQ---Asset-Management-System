# 09. AssetIQ — REST API Reference Catalog

## Authentication Endpoints (`/api/v1/auth`)

### 1. User Login
- **Method:** `POST /api/v1/auth/login`
- **Request Body:**
  ```json
  {
    "email": "orgadmin1@test.com",
    "password": "password123"
  }
  ```
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

---

## Asset Registry Endpoints (`/api/v1/assets`)

### 1. Register Asset
- **Method:** `POST /api/v1/assets`
- **Request Body:**
  ```json
  {
    "assetCode": "AST-LAP-002",
    "name": "Dell XPS 15",
    "categoryId": "6a608001b61b9a8bae9c4a01",
    "purchasePrice": 2200,
    "purchaseDate": "2025-06-01"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Asset created successfully",
    "data": {
      "_id": "6a645511ed1a95055efa9f11",
      "assetCode": "AST-LAP-002",
      "name": "Dell XPS 15",
      "status": "available"
    }
  }
  ```

### 2. Mark Asset Damaged / Update Asset
- **Method:** `PUT /api/v1/assets/:id`
- **Request Body:**
  ```json
  {
    "status": "damaged"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Asset updated successfully",
    "data": {
      "_id": "6a645511ed1a95055efa9f11",
      "status": "damaged"
    }
  }
  ```

---

## Maintenance Tickets Endpoints (`/api/v1/maintenance`)

### 1. Complete Maintenance Ticket
- **Method:** `PUT /api/v1/maintenance/:id/complete`
- **Request Body:**
  ```json
  {
    "cost": 150,
    "findings": "Replaced cracked display assembly.",
    "actionsTaken": "Installed OEM replacement screen and recalibrated."
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Maintenance completed and asset status updated",
    "data": {
      "_id": "6a62a110ed1a95055efa7b22",
      "status": "resolved"
    }
  }
  ```

---

## Offboarding Endpoints (`/api/v1/offboarding`)

### 1. Bulk Return Employee Assets
- **Method:** `POST /api/v1/offboarding/:employeeId/return-all`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Returned 2 assets to available stock"
  }
  ```

# 05. AssetIQ — Backend Request Processing Lifecycle

## Express Middleware Pipeline Execution Order

```mermaid
flowchart TD
    ClientReq[HTTP Request from React Client] --> AppJs[app.js Express Root]
    
    subgraph 1. Global Pre-Processing
        AppJs --> CORS[cors credentials: true]
        CORS --> CookieParser[cookieParser]
        CookieParser --> JSONParser[express.json]
    end
    
    subgraph 2. Route Matching & Authentication
        JSONParser --> RouteMatch{Route Match /api/v1/assets}
        RouteMatch --> ProtectMW[auth.middleware.js protect]
        ProtectMW --> VerifyJWT{Verify JWT Cookie}
        VerifyJWT -- Invalid/Expired --> Return401[Return 401 Unauthorized]
        VerifyJWT -- Valid --> HydrateUser[Hydrate req.user & req.orgId]
    end
    
    subgraph 3. Multi-Tenant Execution Context
        HydrateUser --> TenantMW[tenant.middleware.js tenantScope]
        TenantMW --> AsyncStore[runWithTenant AsyncLocalStorage Store]
    end
    
    subgraph 4. Role Authorization
        AsyncStore --> RBACMW[rbac.middleware.js requireRole]
        RBACMW -- Role Unauthorized --> Return403[Return 403 Forbidden]
        RBACMW -- Role Authorized --> Controller[Execute Controller Handler]
    end
    
    subgraph 5. Controller & Database Layer
        Controller --> ZodValidation{Zod Payload Validation}
        ZodValidation -- Invalid --> Return400[Return 400 Bad Request]
        ZodValidation -- Valid --> MongooseCall[Mongoose Model Query]
        MongooseCall --> TenantPlugin[tenantScopePlugin appends organizationId]
        TenantPlugin --> MongoDB[(MongoDB Read/Write)]
    end
    
    subgraph 6. Response Formatting & Error Catch
        MongoDB --> ControllerSuccess[sendResponse 200/201 JSON]
        Controller -- Exception Thrown --> ErrorMW[error.middleware.js Central Error Handler]
        ErrorMW --> FormattedError[Return Standardized JSON Error]
    end
```

---

## Detailed Step-by-Step Request Lifecycle

1. **Incoming Request:** Client sends HTTP request (e.g. `POST /api/v1/assets`). Browser automatically includes the HTTP-only `accessToken` cookie.
2. **Body & Cookie Parsing:** Express runs `cookieParser()` to populate `req.cookies` and `express.json()` to parse payload JSON into `req.body`.
3. **JWT Verification:** `protect` middleware extracts `accessToken`, verifies its cryptographic signature using `JWT_ACCESS_SECRET`, fetches the matching user document from MongoDB, and attaches it to `req.user`.
4. **Tenant Context Initialization:** `tenantScope` middleware extracts `req.user.organizationId` and calls `runWithTenant(orgId, async () => next())`, initializing Node.js `AsyncLocalStorage`.
5. **RBAC Permission Verification:** `requireRole('org_admin', 'asset_manager')` checks `req.user.role`. If authorized, execution proceeds.
6. **Controller Logic Execution:** Controller validates inputs using Zod schemas (`createAssetSchema.parse(req.body)`).
7. **ORM Database Interaction:** Mongoose model methods (`Asset.create(...)`) are intercepted by `tenantScopePlugin`, which automatically attaches `organizationId` from `AsyncLocalStorage`.
8. **Response Dispatch:** Controller invokes `sendResponse(res, 201, true, 'Asset created', asset)`, returning standard JSON structure:
   ```json
   {
     "success": true,
     "message": "Asset created",
     "data": { ... }
   }
   ```

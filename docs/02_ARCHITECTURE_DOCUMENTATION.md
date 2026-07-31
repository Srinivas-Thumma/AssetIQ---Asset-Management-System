# 02. AssetIQ — System Architecture & Layered Design

## High-Level Architecture
AssetIQ follows a decoupled, multi-layered client-server architecture. The frontend is a Single Page Application (SPA) built with React 18 and Vite, communicating via REST HTTP APIs and Socket.IO WebSockets with a Node.js/Express backend server connected to MongoDB and an on-premise Ollama LLM.

```mermaid
graph TB
    subgraph Client Layer (React SPA)
        ReactApp[React 18 Single Page App]
        AuthCtx[AuthContext Provider]
        SocketCtx[SocketContext Provider]
    end

    subgraph Transport Layer
        HTTP[HTTPS REST API Calls]
        WS[Socket.IO WebSockets Connection]
    end

    subgraph Backend Infrastructure (Node.js & Express)
        Server[Express App Server port 5000]
        
        subgraph Middleware Pipeline
            CORS[CORS & Cookie Parser]
            AuthMW[Auth Middleware JWT Verify]
            TenantMW[Tenant Context Middleware AsyncLocalStorage]
            RBACMW[RBAC Role Guard]
        end
        
        subgraph Controllers Layer
            AuthCtrl[Auth Controller]
            AssetCtrl[Asset Controller]
            MaintCtrl[Maintenance Controller]
            AdminCtrl[Admin Controller]
            OffboardCtrl[Offboarding Controller]
        end

        subgraph Background Services & Jobs
            CronJobs[Nightly AI & Daily Warranty Cron Jobs]
            AIService[4-Tier AI Engine Cache -> Mock -> LLM 60s Timeout -> Fallback]
            SocketEngine[Socket.IO Real-Time Messaging Engine]
        end
    end

    subgraph Storage & External Services
        MongoDB[(MongoDB Database Multi-Tenant)]
        Ollama[Local Ollama LLM Service qwen2.5:3b / llama3.1:8b]
    end

    ReactApp --> AuthCtx & SocketCtx
    AuthCtx --> HTTP
    SocketCtx --> WS
    
    HTTP --> Server
    WS --> SocketEngine
    
    Server --> CORS --> AuthMW --> TenantMW --> RBACMW
    RBACMW --> AuthCtrl & AssetCtrl & MaintCtrl & AdminCtrl & OffboardCtrl
    
    AssetCtrl & MaintCtrl --> AIService
    AIService --> Ollama
    AIService --> MongoosePlugin[Mongoose tenantScopePlugin]
    
    AuthCtrl & AssetCtrl & MaintCtrl & AdminCtrl & OffboardCtrl --> MongoosePlugin
    MongoosePlugin --> MongoDB
```

---

## Detailed Directory & Folder Structure

```
AssetIQ/
├── assetiq-backend/                  # Express REST & WebSocket API Gateway
│   ├── src/                          # Backend source root
│   │   ├── config/                   # System configuration & third-party connectors
│   │   │   ├── db.js                 # MongoDB connection manager
│   │   │   ├── env.js                # Environment variable schema & validation
│   │   │   └── socket.js             # Socket.IO infrastructure & room manager
│   │   ├── controllers/              # Business logic handlers
│   │   │   ├── admin.controller.js   # Platform super admin & org management
│   │   │   ├── ai.controller.js      # Manual AI health score recalculation
│   │   │   ├── asset.controller.js   # Asset CRUD, custody, & damaged trigger
│   │   │   ├── auth.controller.js    # JWT authentication, login, refresh, logout
│   │   │   ├── location.controller.js# Hierarchy tree: Branch -> Building -> Floor -> Room
│   │   │   ├── lookup.controller.js  # Organization lookups: Dept, Category, Vendor, Emp
│   │   │   ├── maintenance.controller.js # Ticket lifecycle, servicing, & live chat
│   │   │   ├── notification.controller.js# User in-app notifications
│   │   │   ├── offboarding.controller.js # Employee offboarding & bulk asset collection
│   │   │   ├── platformBanner.controller.js # System announcement banners
│   │   │   ├── report.controller.js  # Analytics, valuation, & maintenance cost metrics
│   │   │   └── warranty.controller.js# Warranty policy linking & alerts
│   │   ├── jobs/                     # Automated background cron jobs
│   │   │   ├── healthScore.job.js    # Nightly 2:00 AM AI health score batch calculation
│   │   │   └── warrantyAlert.job.js  # Daily 1:00 AM warranty expiration alert generator
│   │   ├── middlewares/              # Express request middleware pipeline
│   │   │   ├── auth.middleware.js    # JWT cookie verification & user hydration
│   │   │   ├── error.middleware.js   # Centralized error handler & status mapper
│   │   │   ├── rbac.middleware.js    # Role-Based Access Control guard
│   │   │   └── tenant.middleware.js  # Multi-tenant context extraction
│   │   ├── models/                   # Mongoose data schemas & domain models
│   │   │   ├── plugins/
│   │   │   │   └── tenantScope.plugin.js # Automatic query scoping Mongoose plugin
│   │   │   ├── Asset.js, User.js, Organization.js, etc.
│   │   ├── routes/                   # HTTP REST Route definitions
│   │   ├── services/                 # External & domain services (ai.service.js, qr.service.js)
│   │   ├── utils/                    # Shared utilities (tenantContext.js, apiResponse.js)
│   │   └── app.js                    # Express app initialization & route mounting
│   └── server.js                     # HTTP server entry point & Socket.IO mounting
│
└── assetiq-frontend/                 # Single Page React Application
    ├── src/
    │   ├── components/               # Specialized UI components & modals
    │   ├── context/                  # React Context state (AuthContext, SocketContext)
    │   ├── views/                    # Application pages (Dashboard, Assets, Maintenance, etc.)
    │   ├── App.jsx                   # Main layout container & dynamic role routing
    │   └── main.jsx                  # React DOM root render entry point
```

---

## API Layer Responsibilities
1. **Routing Layer (`src/routes/`):** Defines RESTful endpoints, maps HTTP verbs to controllers, and applies route-specific middleware (`protect`, `tenantScope`, `requireRole`).
2. **Middleware Layer (`src/middlewares/`):** Intercepts requests to verify JWT cookies, extract tenant context into `AsyncLocalStorage`, enforce RBAC permissions, and handle global runtime errors.
3. **Controller Layer (`src/controllers/`):** Orchestrates business logic, parses request input, invokes domain services, queries database models, and formats standardized JSON responses via `sendResponse`.
4. **Service Layer (`src/services/`):** Decoupled engines handling complex non-HTTP tasks (e.g. 4-tier AI analysis via Ollama, QR base64 code generation).
5. **Data Layer (`src/models/`):** Defines Mongoose schemas, indexes, validation rules, pre-save hooks, and registers `tenantScopePlugin` for dynamic query isolation.

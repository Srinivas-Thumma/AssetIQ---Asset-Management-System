# 15. AssetIQ — Developer & Contributor Guide

## 1. Project Setup & Prerequisites
- **Node.js:** v18.x or higher
- **MongoDB:** Local `mongodb://127.0.0.1:27017/assetiq` or MongoDB Atlas instance
- **Ollama LLM:** Installed locally with model `qwen2.5:3b` or `llama3.1:8b` (`ollama pull qwen2.5:3b`)

---

## 2. Step-by-Step Developer Guides

### A. How to Add a New Multi-Tenant Model
1. Create schema file in `assetiq-backend/src/models/NewEntity.js`.
2. Import and register `tenantScopePlugin`:
   ```javascript
   import mongoose from 'mongoose';
   import { tenantScopePlugin } from './plugins/tenantScope.plugin.js';

   const newEntitySchema = new mongoose.Schema({
     name: { type: String, required: true },
     description: String,
   }, { timestamps: true });

   newEntitySchema.plugin(tenantScopePlugin);

   export const NewEntity = mongoose.model('NewEntity', newEntitySchema);
   ```

### B. How to Add a New REST API Endpoint
1. Create controller function in `src/controllers/newEntity.controller.js`:
   ```javascript
   import { NewEntity } from '../models/NewEntity.js';
   import { sendResponse } from '../utils/apiResponse.js';

   export const getEntities = async (req, res, next) => {
     try {
       const items = await NewEntity.find();
       return sendResponse(res, 200, true, 'Entities fetched', items);
     } catch (err) {
       next(err);
     }
   };
   ```
2. Register route in `src/routes/newEntity.route.js`:
   ```javascript
   import express from 'express';
   import { protect } from '../middlewares/auth.middleware.js';
   import { tenantScope } from '../middlewares/tenant.middleware.js';
   import { requireRole } from '../middlewares/rbac.middleware.js';
   import { getEntities } from '../controllers/newEntity.controller.js';

   const router = express.Router();

   router.use(protect, tenantScope);
   router.get('/', requireRole('org_admin', 'asset_manager'), getEntities);

   export default router;
   ```
3. Mount route in `src/app.js`:
   ```javascript
   import newEntityRouter from './routes/newEntity.route.js';
   app.use('/api/v1/new-entities', newEntityRouter);
   ```

---

## 3. Coding Standards & Naming Conventions
- **Files:** `camelCase.controller.js`, `PascalCase.js` for Mongoose Models, `PascalCase.jsx` for React components.
- **API Responses:** Always use `sendResponse(res, statusCode, success, message, data)` for uniform JSON structures.
- **Tenant Isolation:** Always attach `tenantScopePlugin` to any multi-tenant database schema.

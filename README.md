# AssetIQ — Solo, Local, Explainable Asset Management

AssetIQ is a physical hardware asset management and failure diagnostics platform built for multi-tenant organizations. It runs entirely locally on your machine with zero external cloud dependencies.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: Version 18.x or newer (Tested on v18.20.4)
- **MongoDB**: A running local MongoDB instance (e.g. `mongodb://127.0.0.1:27017/assetiq`) or Atlas free tier connection.
- **Ollama** (Optional): Install [Ollama](https://ollama.com/) locally to run LLM operations.
  - Pull model: `ollama pull llama3.1:8b`
  - Start daemon: `ollama serve`
  - If Ollama is not installed/running, set `MOCK_AI=true` in `.env` to fallback to deterministic, state-based mock analysis (active by default).

---

## 🛠️ Installation & Execution

### 1. Run Diagnostics (Health Verification)
We have bundled a diagnostics script to check your local environment, compile models, and test database pings before starting the server.

```bash
cd assetiq-backend
npm run test:health
```

### 2. Start Express Backend
```bash
cd assetiq-backend
# Install dependencies (if not done)
npm install
# Start server in development mode (with nodemon)
npm run dev
```
The server starts on [http://localhost:5000](http://localhost:5000). 
- Health check URL: [http://localhost:5000/health](http://localhost:5000/health)

### 3. Start React Frontend
```bash
cd assetiq-frontend
# Install dependencies (if not done)
npm install
# Launch local Vite server
npm run dev
```
The client starts on [http://localhost:5173](http://localhost:5173).

---

## 👤 Seeding & Credentials

### Platform Super Admin
On backend startup, a global Super Admin account is automatically seeded if it does not exist:
- **Email**: `superadmin@assetiq.com`
- **Password**: `superadmin123`

### Org Registering (Bootstrapping Tenants)
Registering a new organization via the client sign-up screen boots a new tenant with:
- Default **Plan** (Free tier, limited to 10 active assets).
- Seeded **Branch** (Headquarters) and **Room** (IT Lab).
- Seeded **Departments** (Information Technology) and **Categories** (Laptops, HVAC).
- Seeded admin user with role `org_admin`.

---

## 💡 Tech Design Talking Points (For Interviews/Reviews)

If asked about architecture decisions in a review, here are the direct, defensible explanations:

### 1. Multi-Tenancy Context Scoping
* **How it works**: Uses Node.js's native `AsyncLocalStorage` to store the active tenant context (`organizationId`) set by `tenant.middleware.js` from the verified JWT. A Mongoose plugin (`tenantScope.plugin.js`) automatically intercepts query hooks (`find`, `findOne`, `update`, `delete`) and appends `{ organizationId: currentTenantId }` filters.
* **Why**: Prevents "tenant leaks" by ensuring a controller cannot query cross-tenant data. It decouples scoping logic from controllers so developers don't have to remember to add filters manually.
* **Global Super Admin Bypass**: When the request is made by a `super_admin` role, the scoping is bypassed (remains undefined), allowing cross-org aggregation query runs.

### 2. Explainable AI vs Supervised ML
* **How it works**: Integrates with local Ollama (`llama3.1:8b`) via HTTP. It feeds structured asset state (age, category, repair frequency, cumulative cost, and maintenance logs) into a tight prompt specifying JSON format output.
* **Why**: Standard supervised models require historical failure-labeled datasets to train, which do not exist at this stage. An LLM reasoning over structured data provides a realistic failure risk and health score analysis without fabricated training data.
* **Mock Mode Fallback**: A `MOCK_AI=true` flag routes calls through a deterministic, state-based mock score generator, ensuring instant responses during live demos without dependency on active local LLM inference engines.
* **Caching Gate**: Health scores are cached in Mongoose under `asset.ai.lastAnalyzedAt` and only recomputed on-demand or during nightly cron sweeps if older than 24 hours.

### 3. In-Process Jobs vs Message Queues
* **How it works**: Uses `node-cron` running in-process for daily warranty audits (`warrantyAlert.job.js`) and nightly AI recalculations (`healthScore.job.js`).
* **Why**: At this scale, running Redis and Bull/RabbitMQ infrastructure introduces unnecessary setup overhead. In-process cron jobs are simple, fast, and run reliably on the local machine.

### 4. Shared Database vs Database-Per-Tenant
* **How it works**: Implemented multi-tenancy via a shared database using the `organizationId` discriminator and compound indexes.
* **Why**: Database-per-tenant patterns are complex to host and maintain locally. Shared databases are standard for early SaaS and make cross-tenant Super Admin dashboards and analytics aggregation simple to compute.

# 14. AssetIQ — Debugging & Common Bugs Playbook

## 1. System Bug Post-Mortems & Fixes

### Bug 1: Ollama Local LLM Abort Timeout (`This operation was aborted`)
- **Console Output:** `⚠️ AI Service: Ollama query failed (This operation was aborted). Falling back to mock calculation.`
- **Root Cause:** In [`src/services/ai.service.js`](file:///C:/Projects/AssetIQ/assetiq-backend/src/services/ai.service.js), the `AbortController` timeout was set to `12000` ms (12 seconds). Local LLM inference for `llama3.1:8b` takes ~18.4s, causing every fetch call to abort at 12s and fall back to mock calculations.
- **How to Debug:** Run a standalone benchmark script timing `fetch('http://127.0.0.1:11434/api/generate')` to observe actual model response latency.
- **Fix:** Extended timeout from **12s to 60s** (`60000` ms), prioritized fast JSON models (`qwen2.5:3b` -> `llama3.1:8b`), and sanitized response text (`replace(/<think>[\s\S]*?<\/think>/gi, '')`).

---

### Bug 2: React Component Reference Error (`ShieldIcon is not defined`)
- **Console Output:** `App.jsx:226 Uncaught ReferenceError: ShieldIcon is not defined`
- **Root Cause:** `ShieldCheck as ShieldIcon` was removed during a cleanup pass, but `ShieldIcon` was referenced in the `navItems` array for the Warranties menu item.
- **How to Debug:** Inspect the stack trace in browser console pointing to `App.jsx:226`.
- **Fix:** Restored `ShieldCheck as ShieldIcon` in the `lucide-react` import statement in [`App.jsx`](file:///C:/Projects/AssetIQ/assetiq-frontend/src/App.jsx).

---

### Bug 3: Employee Deletion Fails with Assigned Assets
- **Console Output:** `400 Bad Request: Employee has 2 assigned assets.`
- **Root Cause:** Relational safety check blocked deletion, but frontend did not catch the 400 error to trigger the offboarding modal.
- **Fix:** Updated `handleDelete` in [`OrganizationSetup.jsx`](file:///C:/Projects/AssetIQ/assetiq-frontend/src/views/OrganizationSetup.jsx) to catch assigned asset blocks and open [`OffboardingChecklistModal.jsx`](file:///C:/Projects/AssetIQ/assetiq-frontend/src/components/OffboardingChecklistModal.jsx).

---

### Bug 4: Mongoose ObjectId Timed Out During Query
- **Console Output:** `MongooseError: Operation assets.findOne() buffering timed out after 10000ms`
- **Root Cause:** Mongoose query executed before database connection (`connectDB()`) was established.
- **Fix:** Ensure `await connectDB()` completes before invoking Mongoose model queries in scripts.

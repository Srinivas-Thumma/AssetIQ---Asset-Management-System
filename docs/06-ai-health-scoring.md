# 06 — AI Health Scoring

## Overview
Every asset has an embedded `ai` sub-document that holds a health score (0–100), failure risk percentage, maintenance date prediction, and textual insights. The scoring runs through a 4-tier decision tree: cache check, mock mode, live Ollama LLM inference, fallback mock. A separate heuristic (`predictNextMaintenance`) calculates the predicted maintenance date independently from the health score.

---

## Files Involved

| File | Role |
|---|---|
| `src/services/ai.service.js` | Core logic: `analyzeAssetHealth()`, `generateMockScore()`, `predictNextMaintenance()`. |
| `src/controllers/ai.controller.js` | `recomputeHealthScore()` — manual trigger endpoint; `getHealthScoreStatus()` — read endpoint. |
| `src/controllers/asset.controller.js` | Calls `analyzeAssetHealth()` on `createAsset()`. |
| `src/controllers/maintenance.controller.js` | Calls `analyzeAssetHealth()` on `completeMaintenance()`. |
| `src/jobs/healthScore.job.js` | Nightly cron that calls `analyzeAssetHealth()` for every non-retired asset. |
| `src/routes/ai.route.js` | Declares `POST /ai/recompute/:assetId` and `GET /ai/status/:assetId`. |
| `src/models/AiAuditLog.js` | Written at start of every `analyzeAssetHealth()` call (outside catch block). |

---

## The Four Entry Points That Trigger `analyzeAssetHealth()`

1. **`createAsset()`** — called with `forceRecompute: true` immediately after a new asset is saved. This gives every new asset an initial health score.
2. **`completeMaintenance()`** — called with `forceRecompute: true` after a ticket is resolved and a `MaintenanceHistory` record is created. This re-scores the asset now that it has new repair data.
3. **`POST /api/v1/ai/recompute/:assetId`** — manual "Recalculate AI" button in the UI, handled by `recomputeHealthScore()` in `ai.controller.js`. Always passes `forceRecompute: true`.
4. **Nightly cron (`healthScore.job.js`)** — runs `'* 0 * * *'` (see Known Limitations for the cron expression issue), passes `forceRecompute: true` for every non-retired asset across all tenants.

---

## 24-Hour Cache Check (Tier 1)

```js
if (!forceRecompute && asset.ai && asset.ai.healthScore !== undefined) {
  const hoursSinceLast = (Date.now() - new Date(asset.ai.lastAnalyzedAt)) / (1000 * 60 * 60);
  if (hoursSinceLast < 24) {
    return { healthScore, insights, lastAnalyzedAt, predictedNextMaintenanceDate, failureRiskPercent };
  }
}
```

**All four entry points pass `forceRecompute: true`**, which means the cache check is never used by any current caller. It exists for potential future callers that don't force a recompute.

---

## Mock Scoring Formula (Tier 2 + Tier 4 Fallback)

`generateMockScore(asset, categoryName, history)` — deterministic, no LLM.

**Starting score: 95**

```
Age penalty (calculated from purchaseDate to now):
  > 5 years   → score -= 18
  > 2 years   → score -= 8
  ≤ 2 years   → no penalty

Repair count penalty (history.length):
  > 3 repairs → score -= 22
  > 0 repairs → score -= (6 × count)   [linear: 1 repair=-6, 2=-12, 3=-18]

Cumulative repair cost vs purchase price:
  totalCost > purchasePrice × 0.5 → score -= 15

Status hard caps (applied after point deductions):
  status === 'damaged'          → score = Math.min(score, 25)
  status === 'under_maintenance'→ score = Math.min(score, 65)

Final bounds:
  score = Math.max(5, Math.min(100, Math.round(score)))
```

**Derived fields (all computed FROM the final score):**
```
failureRiskPercent = Math.max(5, Math.min(95, Math.round(100 - score)))
remainingUsefulLifeMonths = Math.max(0, Math.round(60 - ageInYears × 12))
priority:
  failureRiskPercent > 70  → "Critical"
  failureRiskPercent > 45  → "High"
  failureRiskPercent > 20  → "Medium"
  else                     → "Low"
replacementRecommendation:
  score < 50  → "High degradation detected. Plan to replace the asset."
  score < 75  → "Moderate wear. Monitor performance and schedule servicing."
  else        → "Asset is in healthy condition. Normal preventive checks apply."
```

Note: `categoryName` is passed to `generateMockScore` but is **not used** anywhere inside the function. It's a parameter that doesn't influence the output.

---

## Live Ollama Path (Tier 3)

Only executes if `env.MOCK_AI` is falsy.

### Step 1: Context Assembly
```js
const category = await Category.findById(asset.categoryId);
const history = await MaintenanceHistory.find({ assetId: asset._id }).sort({ date: -1 });
const warranty = await Warranty.findOne({ assetId: asset._id });
const ageInYears = (Date.now() - new Date(asset.purchaseDate)) / (ms per year);
```

### Step 2: Model Selection
```js
const preferredModels = ['qwen2.5:3b', 'llama3.1:8b', 'mistral:latest', 'llama2:latest', 'deepseek-r1:1.5b'];
```
Fetches `GET ${OLLAMA_URL}/api/tags` to get available models, then finds the first `preferredModels` entry that appears in the available list. Falls back to `'llama3.1:8b'` as default if the tags fetch fails.

### Step 3: Prompt Construction
The prompt explicitly includes: asset name, code, category name, current status, age in years (1 decimal), purchase price, warranty JSON (or string `'No active warranty'`), total maintenance event count, and maintenance log details (date, cost, findings, actionsTaken) as JSON. It instructs the model to return ONLY a JSON object with 7 specific fields.

### Step 4: Ollama Request
```js
POST ${OLLAMA_URL}/api/generate
{
  model: targetModel,
  prompt: <constructed string>,
  stream: false,
  format: 'json'
}
```
`AbortController` timeout: **60,000ms (60 seconds)**.

### Step 5: Response Sanitization
```js
rawText = rawText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();  // DeepSeek reasoning blocks
rawText = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
const parsedContent = JSON.parse(rawText);
```

### Step 6: Schema Validation
Validates `typeof parsedContent.healthScore === 'number'`, `typeof parsedContent.failureRiskPercent === 'number'`, and `Array.isArray(parsedContent.insights)`. Any failure throws and triggers Tier 4.

### Step 7: Date Calculation
```js
const predictedDate = new Date();
predictedDate.setDate(predictedDate.getDate() + (parsedContent.predictedNextMaintenanceDays || 30));
```
The LLM returns days-from-today as an integer; the service converts it to a Date.

---

## Fallback to Mock (Tier 4)

If Tier 3 throws for any reason (network error, timeout abort, JSON parse failure, schema validation failure):
```js
catch (error) {
  console.warn(`⚠️ AI Service: Ollama query failed (${error.message}). Falling back to mock calculation.`);
  // Re-queries Category and MaintenanceHistory (same queries as Tier 3 already ran)
  const mockScore = generateMockScore(asset, categoryName, history);
  const predictedNextMaintenanceDate = predictNextMaintenance(asset, history, mockScore.healthScore);
  return { ...mockScore, predictedNextMaintenanceDate };
}
```

Note: The fallback re-fetches `Category` and `MaintenanceHistory` even though Tier 3 had already fetched them. These are not in scope after the catch block.

---

## `predictNextMaintenance()` Heuristic

This is separate from both the mock score and the Ollama output:

```js
predictNextMaintenance(asset, maintenanceHistory, currentHealth)
```

**If `maintenanceHistory.length < 2`** (not enough data for gap analysis):
```js
const daysOffset = Math.max(30, Math.round(180 × (health / 100)));
// health=100 → 180 days, health=50 → 90 days, health=20 → 36 days (min 30)
```

**If `maintenanceHistory.length >= 2`** (uses actual repair cadence):
```js
Sort all maintenance dates ascending.
Calculate gaps in days between consecutive events.
Average the gaps.
Next predicted date = lastMaintenanceDate + avgGap days.
```

This heuristic runs for the mock path and the Tier 4 fallback. In the live Ollama path, the predicted date comes from `parsedContent.predictedNextMaintenanceDays` (LLM output) instead.

---

## What Gets Saved to `asset.ai`

All four triggers save only these 5 fields to `asset.ai`:
```js
asset.ai = {
  healthScore,
  insights,
  lastAnalyzedAt,
  predictedNextMaintenanceDate,
  failureRiskPercent,
}
```

`remainingUsefulLifeMonths`, `replacementRecommendation`, and `priority` are returned by `analyzeAssetHealth()` but are NOT persisted. They are included in the API response and displayed in the UI modal on that request, but lost on the next page load if not recomputed.

---

## Known Limitations / Things Worth Knowing

- **Both cron jobs use `'* 0 * * *'`** — this runs every minute from 00:00 to 00:59, not once. If this is the health score job's actual cron string, Ollama would be queried 60 times per night for each asset. The console log says "nightly at 2:00 AM" which doesn't match the expression. Strongly worth verifying.
- **`categoryName` is unused in `generateMockScore()`** — the function signature accepts it but never references it internally. The score is not influenced by asset category.
- **Tier 3 and Tier 4 re-fetch the same data** — after a Tier 3 failure, the catch block re-queries `Category` and `MaintenanceHistory`. Wasteful but not broken.
- **`remainingUsefulLifeMonths`, `replacementRecommendation`, `priority` are not persisted** — they exist on the Asset schema (schema defined in `Asset.js`) but the controller only writes 5 fields. The schema fields for these are never populated by the current code.
- **The 60-second timeout is per-asset** — with many assets and the nightly cron running, total execution time could be substantial if Ollama inference is slow.

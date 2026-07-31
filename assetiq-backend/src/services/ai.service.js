import { env } from '../config/env.js';
import { MaintenanceHistory } from '../models/MaintenanceHistory.js';
import { Category } from '../models/Category.js';
import { AiAuditLog } from '../models/AiAuditLog.js';
import { Warranty } from '../models/Warranty.js';

// Deterministic mock algorithm for backup/demo mode
export const generateMockScore = (asset, categoryName, history) => {
  let score = 95;
  const insights = [];

  const ageInYears = (Date.now() - new Date(asset.purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  
  if (ageInYears > 5) {
    score -= 18;
    insights.push(`Asset is in long-term service (${ageInYears.toFixed(1)} years old). Regular monitoring recommended.`);
  } else if (ageInYears > 2) {
    score -= 8;
    insights.push(`Asset has been in service for ${ageInYears.toFixed(1)} years.`);
  } else {
    insights.push(`Asset is relatively new (${ageInYears.toFixed(1)} years in service).`);
  }

  const maintenanceCount = history.length;
  if (maintenanceCount > 3) {
    score -= 22;
    insights.push(`Frequent repair history (${maintenanceCount} instances). Review for potential replacement.`);
  } else if (maintenanceCount > 0) {
    score -= (6 * maintenanceCount);
    insights.push(`Has undergone ${maintenanceCount} maintenance event(s).`);
  }

  // Cost analysis
  const totalCost = history.reduce((acc, curr) => acc + curr.cost, 0);
  if (totalCost > asset.purchasePrice * 0.5) {
    score -= 15;
    insights.push(`Cumulative maintenance cost ($${totalCost}) exceeds 50% of purchase price ($${asset.purchasePrice}).`);
  }

  // Status adjustments
  if (asset.status === 'damaged') {
    score = Math.min(score, 25);
    insights.push(`Asset currently reported as DAMAGED. Immediate repair or decommission required.`);
  } else if (asset.status === 'under_maintenance') {
    score = Math.min(score, 65);
    insights.push(`Asset is currently flagged as UNDER MAINTENANCE.`);
  }

  // Cap bounds
  score = Math.max(5, Math.min(100, Math.round(score)));
  
  if (score > 85 && insights.length < 2) {
    insights.push(`Performance is stable. Maintenance cycles are up to date.`);
  }

  const failureRiskPercent = Math.max(5, Math.min(95, Math.round(100 - score)));
  const remainingUsefulLifeMonths = Math.max(0, Math.round(60 - ageInYears * 12));
  const replacementRecommendation = score < 50 
    ? "High degradation detected. Plan to replace the asset." 
    : score < 75 
      ? "Moderate wear. Monitor performance and schedule servicing." 
      : "Asset is in healthy condition. Normal preventive checks apply.";
  const priority = failureRiskPercent > 70 ? "Critical" : failureRiskPercent > 45 ? "High" : failureRiskPercent > 20 ? "Medium" : "Low";

  return {
    healthScore: score,
    insights,
    failureRiskPercent,
    remainingUsefulLifeMonths,
    replacementRecommendation,
    priority,
    lastAnalyzedAt: new Date(),
  };
};

// Heuristic-based maintenance forecasting algorithm
export const predictNextMaintenance = (asset, maintenanceHistory, currentHealth) => {
  const health = currentHealth !== undefined ? currentHealth : (asset.ai?.healthScore || 100);
  
  if (maintenanceHistory.length < 2) {
    // Heuristic fallback: if not enough history, forecast based on current health score
    const daysOffset = Math.max(30, Math.round(180 * (health / 100)));
    const predictedDate = new Date();
    predictedDate.setDate(predictedDate.getDate() + daysOffset);
    
    return predictedDate;
  }

  // Calculate gaps in days between consecutive events
  const dates = maintenanceHistory.map(h => new Date(h.date)).sort((a, b) => a - b);
  const gaps = [];
  for (let i = 1; i < dates.length; i++) {
    gaps.push((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24));
  }
  
  const avgGapDays = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const lastDate = dates[dates.length - 1];
  
  const predictedDate = new Date(lastDate.getTime() + avgGapDays * 24 * 60 * 60 * 1000);
  return predictedDate;
};

/**
 * AI Asset Health Scoring & Predictive Analytics Engine:
 * Analyzes asset age, maintenance ticket frequency, total repair cost, and warranty coverage to generate:
 * - Health Score (0–100 index)
 * - Predictive Maintenance Date (next recommended servicing)
 * - Risk Assessment % & Actionable Insights
 * 
 * 4-Tier Execution & Fallback Decision Tree:
 * Tier 1: Cache Check (Returns existing score if analyzed within 24h, unless `forceRecompute = true`).
 * Tier 2: Mock Mode Branch (`MOCK_AI=true` -> Deterministic offline algorithm for testing without local GPU).
 * Tier 3: Live Local LLM Query (Pings Ollama `/api/generate` with structured JSON prompt).
 * Tier 4: Graceful Failover (If Ollama is offline or times out, falls back to deterministic mock calculation without throwing 500 errors).
 */
export const analyzeAssetHealth = async (asset, forceRecompute = false) => {
  if (!asset) return null;

  // Tier 1: Cache Check (return stored score if fresh)
  if (!forceRecompute && asset.ai && asset.ai.healthScore !== undefined) {
    const hoursSinceLast = (Date.now() - new Date(asset.ai.lastAnalyzedAt).getTime()) / (1000 * 60 * 60);
    if (hoursSinceLast < 24) {
      return {
        healthScore: asset.ai.healthScore,
        insights: asset.ai.insights,
        lastAnalyzedAt: asset.ai.lastAnalyzedAt,
        predictedNextMaintenanceDate: asset.ai.predictedNextMaintenanceDate,
        failureRiskPercent: asset.ai.failureRiskPercent,
      };
    }
  }

  try {
    await AiAuditLog.create({
      organizationId: asset.organizationId || null,
      assetId: asset._id,
      timestamp: new Date()
    });
  } catch (err) {
    console.error('⚠️ AI Service: Failed to write to AiAuditLog:', err.message);
  }

  try {
    const category = await Category.findById(asset.categoryId);
    const categoryName = category ? category.name : 'Unknown Category';
    
    const history = await MaintenanceHistory.find({ assetId: asset._id }).sort({ date: -1 });
    const warranty = await Warranty.findOne({ assetId: asset._id });

    // Tier 2: Check for Mock Mode Environment Setting
    if (env.MOCK_AI) {
      console.log(`🤖 AI: MOCK_AI=true. Returning mock score for asset: ${asset.name} (${asset.assetCode})`);
      const mockScore = generateMockScore(asset, categoryName, history);
      const predictedNextMaintenanceDate = predictNextMaintenance(asset, history, mockScore.healthScore);
      return { ...mockScore, predictedNextMaintenanceDate };
    }

    // Tier 3: Query Local Ollama LLM Model
    console.log(`🤖 AI: Querying local Ollama model at ${env.OLLAMA_URL} for ${asset.name}...`);
    
    const ageInYears = (Date.now() - new Date(asset.purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    const historySummary = history.map(h => ({
      date: h.date.toISOString().split('T')[0],
      cost: h.cost,
      findings: h.findings,
      actions: h.actionsTaken
    }));

    const warrantyInfo = warranty ? {
      provider: warranty.provider,
      status: warranty.status,
      endDate: warranty.endDate.toISOString().split('T')[0]
    } : 'No active warranty';

    const prompt = `Analyze the health, failure risk, and remaining useful life of THIS SPECIFIC asset, using the data below. Base every number strictly on this asset's actual age, status, and maintenance history — do not reuse any example values.

Asset: ${asset.name}
Code: ${asset.assetCode}
Category: ${categoryName}
Current Status: ${asset.status}
Age: ${ageInYears.toFixed(1)} years
Purchase Price: $${asset.purchasePrice}
Warranty Details: ${JSON.stringify(warrantyInfo)}
Total Maintenance Events: ${history.length}
Maintenance Log Details: ${JSON.stringify(historySummary)}

Predict the following metrics:
1. Health Score (0-100)
2. Failure Risk Probability (0-100)
3. Recommended days until next preventive maintenance
4. Estimated Remaining Useful Life (RUL) in months
5. Replacement recommendation comment
6. Urgency priority level ("Low", "Medium", "High", "Critical")

Return ONLY a JSON object with this exact structure — the values below are placeholders showing the expected TYPE, not real answers:
{
  "healthScore": <integer 0-100, based on this asset's actual condition>,
  "failureRiskPercent": <integer 0-100>,
  "predictedNextMaintenanceDays": <integer, days from today>,
  "remainingUsefulLifeMonths": <integer>,
  "replacementRecommendation": "<one sentence specific to this asset>",
  "priority": "<Low|Medium|High|Critical>",
  "insights": ["<specific observation about this asset>", "<another specific observation>"]
}

Do not include markdown, code fences, or any text outside the JSON object.`;

    // Preferred models in order of speed and JSON adherence
    const preferredModels = ['qwen2.5:3b', 'llama3.1:8b', 'mistral:latest', 'llama2:latest', 'deepseek-r1:1.5b'];
    let targetModel = 'llama3.1:8b';

    try {
      const tagsRes = await fetch(`${env.OLLAMA_URL}/api/tags`);
      if (tagsRes.ok) {
        const tagsData = await tagsRes.json();
        const availableNames = (tagsData.models || []).map(m => m.name);
        
        const matched = preferredModels.find(m => availableNames.includes(m));
        if (matched) {
          targetModel = matched;
        } else if (availableNames.length > 0) {
          targetModel = availableNames[0];
        }
        console.log(`🤖 AI Service: Selected local model '${targetModel}' for asset analysis`);
      }
    } catch (err) {
      console.warn('⚠️ AI: Failed to query available models, using default targetModel:', err.message);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for local inference

    const response = await fetch(`${env.OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: targetModel,
        prompt,
        stream: false,
        format: 'json',
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Ollama HTTP Error: ${response.status}`);
    }

    const responseData = await response.json();
    let rawText = responseData.response || '';

    // Sanitize response text: remove <think>...</think> blocks or ```json markdown wrappers
    rawText = rawText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    rawText = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

    const parsedContent = JSON.parse(rawText);

    if (
      typeof parsedContent.healthScore !== 'number' ||
      typeof parsedContent.failureRiskPercent !== 'number' ||
      !Array.isArray(parsedContent.insights)
    ) {
      throw new Error('Ollama returned invalid schema format');
    }

    const calculatedHealth = Math.max(0, Math.min(100, Math.round(parsedContent.healthScore)));
    const calculatedFailureRisk = Math.max(0, Math.min(100, Math.round(parsedContent.failureRiskPercent)));

    // Calculate predicted date based on days returned by LLM
    const predictedDate = new Date();
    predictedDate.setDate(predictedDate.getDate() + (parsedContent.predictedNextMaintenanceDays || 30));

    return {
      healthScore: calculatedHealth,
      failureRiskPercent: calculatedFailureRisk,
      predictedNextMaintenanceDate: predictedDate,
      remainingUsefulLifeMonths: parsedContent.remainingUsefulLifeMonths || null,
      replacementRecommendation: parsedContent.replacementRecommendation || null,
      priority: parsedContent.priority || null,
      insights: parsedContent.insights,
      lastAnalyzedAt: new Date()
    };

  } catch (error) {
    console.warn(`⚠️ AI Service: Ollama query failed (${error.message}). Falling back to mock calculation.`);
    const category = await Category.findById(asset.categoryId);
    const categoryName = category ? category.name : 'Unknown';
    const history = await MaintenanceHistory.find({ assetId: asset._id }).sort({ date: -1 });
    const mockScore = generateMockScore(asset, categoryName, history);
    const predictedNextMaintenanceDate = predictNextMaintenance(asset, history, mockScore.healthScore);
    return { ...mockScore, predictedNextMaintenanceDate };
  }
};

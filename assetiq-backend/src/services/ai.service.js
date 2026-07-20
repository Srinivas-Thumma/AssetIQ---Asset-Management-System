import { env } from '../config/env.js';
import { MaintenanceHistory } from '../models/MaintenanceHistory.js';
import { Category } from '../models/Category.js';

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

  return {
    healthScore: score,
    insights,
    lastAnalyzedAt: new Date(),
  };
};

export const analyzeAssetHealth = async (asset, forceRecompute = false) => {
  // 1. Cache-first check
  if (
    !forceRecompute &&
    asset.ai &&
    asset.ai.lastAnalyzedAt &&
    (Date.now() - new Date(asset.ai.lastAnalyzedAt).getTime()) < 24 * 60 * 60 * 1000
  ) {
    return asset.ai;
  }

  try {
    // 2. Fetch category and maintenance history for analysis context
    const category = await Category.findById(asset.categoryId);
    const categoryName = category ? category.name : 'Unknown Category';
    
    const history = await MaintenanceHistory.find({ assetId: asset._id }).sort({ date: -1 });

    // 3. Check for Mock Mode
    if (env.MOCK_AI) {
      console.log(`🤖 AI: MOCK_AI=true. Returning mock score for asset: ${asset.name} (${asset.assetCode})`);
      return generateMockScore(asset, categoryName, history);
    }

    // 4. Ollama invocation
    console.log(`🤖 AI: Querying local Ollama model at ${env.OLLAMA_URL} for ${asset.name}...`);
    
    const ageInYears = (Date.now() - new Date(asset.purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    const historySummary = history.map(h => ({
      date: h.date.toISOString().split('T')[0],
      cost: h.cost,
      findings: h.findings,
      actions: h.actionsTaken
    }));

    const prompt = `Analyze the health, failure risk, and lifecycle of this asset.
Asset: ${asset.name}
Code: ${asset.assetCode}
Category: ${categoryName}
Current Status: ${asset.status}
Age: ${ageInYears.toFixed(1)} years
Purchase Price: $${asset.purchasePrice}
Total Maintenance Events: ${history.length}
Maintenance Log Details: ${JSON.stringify(historySummary)}

Return a JSON object with this exact structure:
{
  "healthScore": 85, // Integer between 0 and 100
  "insights": [
    "Insight 1 (one clear descriptive sentence)",
    "Insight 2 (one clear descriptive sentence)"
  ]
}
Do not include any chat formatting, markdown blocks outside the JSON, or extra text. Return ONLY valid JSON.`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout gate

    const response = await fetch(`${env.OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3.1:8b',
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
    const parsedContent = JSON.parse(responseData.response);

    if (typeof parsedContent.healthScore !== 'number' || !Array.isArray(parsedContent.insights)) {
      throw new Error('Ollama returned invalid schema format');
    }

    return {
      healthScore: Math.max(0, Math.min(100, Math.round(parsedContent.healthScore))),
      insights: parsedContent.insights,
      lastAnalyzedAt: new Date(),
    };

  } catch (error) {
    console.warn(`⚠️ AI Service: Ollama query failed (${error.message}). Falling back to mock calculation.`);
    // Fetch category and history again if not loaded
    const category = await Category.findById(asset.categoryId);
    const categoryName = category ? category.name : 'Unknown';
    const history = await MaintenanceHistory.find({ assetId: asset._id });
    return generateMockScore(asset, categoryName, history);
  }
};

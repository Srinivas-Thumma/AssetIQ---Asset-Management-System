import { Asset } from '../models/Asset.js';
import { analyzeAssetHealth } from '../services/ai.service.js';
import { sendResponse } from '../utils/apiResponse.js';

export const recomputeHealthScore = async (req, res, next) => {
  try {
    const asset = await Asset.findById(req.params.assetId);
    if (!asset) {
      return sendResponse(res, 404, false, 'Asset not found');
    }

    console.log(`🤖 AI Controller: Forcing manual health score recalculation for asset ${asset.name}...`);
    const analysis = await analyzeAssetHealth(asset, true);

    asset.ai = {
      healthScore: analysis.healthScore,
      insights: analysis.insights,
      lastAnalyzedAt: analysis.lastAnalyzedAt,
    };

    await asset.save();

    return sendResponse(res, 200, true, 'AI health score recomputed successfully', asset.ai);
  } catch (error) {
    next(error);
  }
};

export const getHealthScoreStatus = async (req, res, next) => {
  try {
    const asset = await Asset.findById(req.params.assetId);
    if (!asset) {
      return sendResponse(res, 404, false, 'Asset not found');
    }

    return sendResponse(res, 200, true, 'AI health score retrieved', asset.ai || { healthScore: 100, insights: [], lastAnalyzedAt: null });
  } catch (error) {
    next(error);
  }
};

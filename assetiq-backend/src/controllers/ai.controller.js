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
      predictedNextMaintenanceDate: analysis.predictedNextMaintenanceDate || null,
      failureRiskPercent: analysis.failureRiskPercent || 0,
      remainingUsefulLifeMonths: analysis.remainingUsefulLifeMonths ?? null,
      replacementRecommendation: analysis.replacementRecommendation ?? null,
      priority: analysis.priority ?? null,
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

export const summarizeTicket = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const { getOrCreateMaintenanceConversation, getConversationMessages } = await import('../services/conversation.service.js');
    const { summarizeTicketThread } = await import('../services/ai.service.js');

    const conversation = await getOrCreateMaintenanceConversation(requestId, req.orgId);
    const { messages } = await getConversationMessages(req.user, conversation._id);
    const summary = await summarizeTicketThread(messages);

    return sendResponse(res, 200, true, 'Ticket conversation summarized', summary);
  } catch (error) {
    next(error);
  }
};

export const getTriageSuggestion = async (req, res, next) => {
  try {
    const { description } = req.body;
    const { suggestTicketTriage } = await import('../services/ai.service.js');
    const triage = suggestTicketTriage(description);
    return sendResponse(res, 200, true, 'AI triage suggestion generated', triage);
  } catch (error) {
    next(error);
  }
};


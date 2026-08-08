import { MaintenanceRequest } from '../models/MaintenanceRequest.js';
import { MaintenanceHistory } from '../models/MaintenanceHistory.js';
import { MaintenanceMessage } from '../models/MaintenanceMessage.js';
import { Asset } from '../models/Asset.js';
import { analyzeAssetHealth } from '../services/ai.service.js';
import {
  getOrCreateMaintenanceConversation,
  getConversationMessages,
  postMessageToConversation,
} from '../services/conversation.service.js';
import { sendResponse } from '../utils/apiResponse.js';

export const getMaintenanceRequests = async (req, res, next) => {
  try {
    const list = await MaintenanceRequest.find()
      .populate({
        path: 'assetId',
        populate: { path: 'categoryId' }
      })
      .populate('raisedBy', 'email role')
      .sort({ createdAt: -1 });

    return sendResponse(res, 200, true, 'Maintenance requests retrieved', list);
  } catch (error) {
    next(error);
  }
};

export const createMaintenanceRequest = async (req, res, next) => {
  try {
    const { assetId, type, priority, description, scheduledDate } = req.body;
    if (!assetId || !type || !description || !scheduledDate) {
      return sendResponse(res, 400, false, 'assetId, type, description, and scheduledDate are required');
    }

    const asset = await Asset.findById(assetId);
    if (!asset) {
      return sendResponse(res, 404, false, 'Asset not found');
    }

    // Check if asset already has an active maintenance ticket
    const existingActiveTicket = await MaintenanceRequest.findOne({
      assetId,
      status: { $in: ['open', 'in_progress', 'assigned'] }
    });

    if (existingActiveTicket) {
      return sendResponse(
        res,
        400,
        false,
        'This asset already has an active maintenance ticket. Please resolve or delete the existing ticket before scheduling a new servicing request.'
      );
    }

    // Set asset status to under_maintenance
    asset.status = 'under_maintenance';
    await asset.save();

    const request = await MaintenanceRequest.create({
      organizationId: req.orgId,
      assetId,
      raisedBy: req.user._id,
      type,
      priority: priority || 'medium',
      description,
      scheduledDate,
      status: 'open',
    });

    return sendResponse(res, 201, true, 'Maintenance request created', request);
  } catch (error) {
    next(error);
  }
};

/**
 * Updates maintenance ticket status or servicing schedule.
 * Lifecycle Transition Trigger:
 * When ticket status transitions to 'assigned' or 'in_progress' (indicating repair work has commenced),
 * the linked Asset status is automatically updated from 'damaged' or 'available' to 'under_maintenance'.
 */
export const updateMaintenanceRequest = async (req, res, next) => {
  try {
    const { status, priority, description, scheduledDate } = req.body;

    const request = await MaintenanceRequest.findById(req.params.id);
    if (!request) {
      return sendResponse(res, 404, false, 'Maintenance request not found');
    }

    if (status) request.status = status;
    if (priority) request.priority = priority;
    if (description) request.description = description;
    if (scheduledDate) request.scheduledDate = scheduledDate;

    await request.save();

    // Work Commenced Trigger: Automatically transition asset status to 'under_maintenance'
    if (['assigned', 'in_progress'].includes(status)) {
      const asset = await Asset.findById(request.assetId);
      if (asset && asset.status !== 'under_maintenance') {
        asset.status = 'under_maintenance';
        await asset.save();
      }
    }

    return sendResponse(res, 200, true, 'Maintenance request updated', request);
  } catch (error) {
    next(error);
  }
};

/**
 * Resolves a maintenance ticket, logs repair history & costs, and restores asset status.
 * Custody State Restoration:
 * If the asset possesses an `assignedTo` custody record, its status is restored to 'assigned'.
 * If unassigned, its status is reset to 'available'.
 */
export const completeMaintenance = async (req, res, next) => {
  try {
    const { cost, findings, actionsTaken } = req.body;
    if (cost === undefined || !findings || !actionsTaken) {
      return sendResponse(res, 400, false, 'cost, findings, and actionsTaken are required');
    }

    const request = await MaintenanceRequest.findById(req.params.id);
    if (!request) {
      return sendResponse(res, 404, false, 'Maintenance request not found');
    }

    if (request.status === 'resolved') {
      return sendResponse(res, 400, false, 'Maintenance request is already resolved');
    }

    // 1. Update Request
    request.status = 'resolved';
    request.completedDate = new Date();
    await request.save();

    // 2. Create Maintenance History Entry
    const history = await MaintenanceHistory.create({
      organizationId: req.orgId,
      assetId: request.assetId,
      requestId: request._id,
      date: new Date(),
      cost: Number(cost),
      findings,
      actionsTaken,
    });

    // 3. Reset Asset Status: If asset has an assignedTo custody record, restore status to 'assigned'. Otherwise reset to 'available'.
    const asset = await Asset.findById(request.assetId);
    if (asset) {
      if (asset.assignedTo) {
        asset.status = 'assigned';
      } else {
        asset.status = 'available';
      }
      await asset.save();

      // 4. Trigger AI Health score recalculation (since asset has new repair logs)
      console.log(`🤖 Triggering AI health score recalculation for asset ${asset.name} after maintenance completion...`);
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
    }

    return sendResponse(res, 200, true, 'Maintenance request completed and logged in history', {
      request,
      history,
      assetHealthScore: asset ? asset.ai.healthScore : null,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMaintenanceRequest = async (req, res, next) => {
  try {
    const request = await MaintenanceRequest.findById(req.params.id);
    if (!request) {
      return sendResponse(res, 404, false, 'Maintenance request not found');
    }

    const assetId = request.assetId;
    await request.deleteOne();

    if (assetId) {
      const otherActive = await MaintenanceRequest.findOne({ assetId, status: { $in: ['open', 'assigned', 'in_progress'] } });
      if (!otherActive) {
        const asset = await Asset.findById(assetId);
        if (asset && asset.status === 'under_maintenance') {
          asset.status = 'available';
          await asset.save();
        }
      }
    }

    return sendResponse(res, 200, true, 'Maintenance request deleted successfully');
  } catch (error) {
    next(error);
  }
};

export const getMaintenanceMessages = async (req, res, next) => {
  try {
    const { id } = req.params;
    const conversation = await getOrCreateMaintenanceConversation(id, req.orgId);
    const { messages } = await getConversationMessages(req.user, conversation._id);

    // Fallback: If no unified Conversation messages exist yet, return legacy MaintenanceMessages
    if (messages.length === 0) {
      const legacyMessages = await MaintenanceMessage.find({ requestId: id }).sort({ createdAt: 1 });
      return sendResponse(res, 200, true, 'Maintenance messages retrieved', legacyMessages);
    }

    return sendResponse(res, 200, true, 'Maintenance messages retrieved', messages);
  } catch (error) {
    next(error);
  }
};

export const createMaintenanceMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { message, isInternalNote } = req.body;

    if (!message || !message.trim()) {
      return sendResponse(res, 400, false, 'Message content is required');
    }

    const conversation = await getOrCreateMaintenanceConversation(id, req.orgId);
    const result = await postMessageToConversation({
      user: req.user,
      conversationId: conversation._id,
      messageText: message,
      isInternalNote: !!isInternalNote,
    });

    // Also write to legacy MaintenanceMessage for backward compatibility with older listeners
    const legacyMessage = await MaintenanceMessage.create({
      organizationId: req.orgId,
      requestId: id,
      senderId: req.user._id,
      senderName: req.user.email.split('@')[0],
      senderRole: req.user.role,
      message: message.trim(),
    });

    try {
      const { getIO } = await import('../config/socket.js');
      let io = null;
      try { io = getIO(); } catch (_) {}
      if (io) {
        io.to(`chat:request:${id}`).emit('chat:message', legacyMessage);
        io.to(`conversation:${conversation._id}`).emit('conversation:message', result.message);
      }
    } catch (_) {}

    return sendResponse(res, 201, true, 'Maintenance message created', result.message);
  } catch (error) {
    next(error);
  }
};

import { MaintenanceRequest } from '../models/MaintenanceRequest.js';
import { MaintenanceHistory } from '../models/MaintenanceHistory.js';
import { Asset } from '../models/Asset.js';
import { analyzeAssetHealth } from '../services/ai.service.js';
import { sendResponse } from '../utils/apiResponse.js';

export const getMaintenanceRequests = async (req, res, next) => {
  try {
    const list = await MaintenanceRequest.find()
      .populate({
        path: 'assetId',
        populate: { path: 'categoryId' }
      })
      .populate('raisedBy', 'email role')
      .sort({ scheduledDate: 1 });

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

    // If request status manually updated to assigned / in_progress, ensure asset reflects under_maintenance
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

    // 3. Reset Asset Status back to available (or assigned depending on history, but default is available)
    const asset = await Asset.findById(request.assetId);
    if (asset) {
      asset.status = 'available';
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

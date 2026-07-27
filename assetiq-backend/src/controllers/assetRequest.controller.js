import AssetRequest from '../models/AssetRequest.js';
import { Asset } from '../models/Asset.js';
import { sendResponse } from '../utils/apiResponse.js';

export const createAssetRequest = async (req, res, next) => {
  try {
    const { assetId, categoryId, targetEmployeeId, type, notes } = req.body;
    const request = await AssetRequest.create({
      organizationId: req.orgId,
      requesterId: req.user._id,
      assetId,
      categoryId,
      targetEmployeeId,
      type: type || 'new_request',
      notes
    });
    return sendResponse(res, 201, true, 'Request submitted successfully', request);
  } catch (error) {
    next(error);
  }
};

export const getAssetRequests = async (req, res, next) => {
  try {
    const requests = await AssetRequest.find({ status: 'pending' })
      .populate('requesterId', 'email role')
      .populate('assetId', 'name assetCode')
      .populate('categoryId', 'name')
      .populate('targetEmployeeId', 'name email');
    return sendResponse(res, 200, true, 'Requests fetched', requests);
  } catch (error) {
    next(error);
  }
};

export const approveAssetRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reviewerNotes } = req.body;

    const request = await AssetRequest.findById(id);
    if (!request || request.status !== 'pending') {
      return sendResponse(res, 400, false, 'Invalid or already processed request');
    }

    request.status = 'approved';
    request.reviewerNotes = reviewerNotes || '';
    await request.save();

    // If it's a specific asset request, assign it atomically
    if (request.type === 'new_request' && request.assetId) {
      await Asset.findOneAndUpdate(
        { _id: request.assetId, status: 'available' },
        { $set: { assignedTo: request.targetEmployeeId || req.user.employeeRef || req.user._id, status: 'assigned' } }
      );
    }

    return sendResponse(res, 200, true, 'Request approved successfully', request);
  } catch (error) {
    next(error);
  }
};

export const rejectAssetRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reviewerNotes } = req.body;
    const updated = await AssetRequest.findByIdAndUpdate(id, { status: 'rejected', reviewerNotes: reviewerNotes || '' }, { new: true });
    return sendResponse(res, 200, true, 'Request rejected', updated);
  } catch (error) {
    next(error);
  }
};

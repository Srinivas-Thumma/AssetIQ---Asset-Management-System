import { evaluateAndRequestApproval, decideApproval } from '../services/approval.service.js';
import { ApprovalRequest } from '../models/ApprovalRequest.js';
import { sendResponse } from '../utils/apiResponse.js';

export const getApprovalRequests = async (req, res, next) => {
  try {
    const list = await ApprovalRequest.find()
      .populate('requestId')
      .populate('assetId')
      .populate('requestedBy', 'email name role')
      .populate('decidedBy', 'email name role')
      .sort({ createdAt: -1 });

    return sendResponse(res, 200, true, 'Approval requests retrieved', list);
  } catch (error) {
    next(error);
  }
};

export const requestTicketApproval = async (req, res, next) => {
  try {
    const { requestId, assetId, amount, reason } = req.body;
    if (!requestId || !assetId || !amount || !reason) {
      return sendResponse(res, 400, false, 'requestId, assetId, amount, and reason are required');
    }

    const result = await evaluateAndRequestApproval({
      organizationId: req.orgId,
      requestId,
      assetId,
      requestedByUser: req.user,
      amount: Number(amount),
      reason,
    });

    return sendResponse(res, 201, true, 'Approval request submitted', result);
  } catch (error) {
    next(error);
  }
};

export const handleApprovalDecision = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { decision, rejectionReason } = req.body;

    if (!['approved', 'rejected'].includes(decision)) {
      return sendResponse(res, 400, false, "Decision must be 'approved' or 'rejected'");
    }

    const updated = await decideApproval({
      approvalId: id,
      decidingUser: req.user,
      decision,
      rejectionReason,
    });

    return sendResponse(res, 200, true, `Approval request ${decision}`, updated);
  } catch (error) {
    next(error);
  }
};

import { ApprovalPolicy } from '../models/ApprovalPolicy.js';
import { ApprovalRequest } from '../models/ApprovalRequest.js';
import { MaintenanceRequest } from '../models/MaintenanceRequest.js';
import { appEventBus, DOMAIN_EVENTS } from '../events/AppEventBus.js';

export const evaluateAndRequestApproval = async ({
  organizationId,
  requestId,
  assetId,
  requestedByUser,
  amount,
  reason,
}) => {
  // Find matching active approval policy by amount threshold
  const policy = await ApprovalPolicy.findOne({
    organizationId,
    isActive: true,
    minimumAmount: { $lte: amount },
    $or: [
      { maximumAmount: { $gte: amount } },
      { maximumAmount: null },
      { maximumAmount: Infinity },
    ],
  }).sort({ minimumAmount: -1 });

  // Auto-approve if amount is below autoApproveBelow limit
  if (policy && amount <= policy.autoApproveBelow) {
    const autoApproval = await ApprovalRequest.create({
      organizationId,
      requestId,
      assetId,
      policyId: policy._id,
      requestedBy: requestedByUser._id,
      amount,
      reason,
      status: 'approved',
      decidedBy: requestedByUser._id,
      decidedAt: new Date(),
    });

    return { approvalRequest: autoApproval, isAutoApproved: true };
  }

  // Create pending ApprovalRequest
  const approvalRequest = await ApprovalRequest.create({
    organizationId,
    requestId,
    assetId,
    policyId: policy ? policy._id : null,
    requestedBy: requestedByUser._id,
    amount,
    reason,
    status: 'pending',
  });

  // Transition maintenance ticket status to pending_approval
  const ticket = await MaintenanceRequest.findById(requestId);
  if (ticket) {
    const fromStatus = ticket.status;
    ticket.status = 'pending_approval';
    await ticket.save();

    appEventBus.emit(DOMAIN_EVENTS.TICKET_STATUS_CHANGED, {
      request: ticket,
      fromStatus,
      toStatus: 'pending_approval',
      actorUser: requestedByUser,
    });
  }

  appEventBus.emit(DOMAIN_EVENTS.APPROVAL_REQUESTED, {
    approvalRequest,
    actorUser: requestedByUser,
  });

  return { approvalRequest, isAutoApproved: false };
};

export const decideApproval = async ({
  approvalId,
  decidingUser,
  decision, // 'approved' | 'rejected'
  rejectionReason = null,
}) => {
  const approvalRequest = await ApprovalRequest.findById(approvalId);
  if (!approvalRequest) {
    const error = new Error('Approval request not found');
    error.statusCode = 404;
    throw error;
  }

  if (approvalRequest.status !== 'pending') {
    const error = new Error(`Approval request is already ${approvalRequest.status}`);
    error.statusCode = 400;
    throw error;
  }

  approvalRequest.status = decision;
  approvalRequest.decidedBy = decidingUser._id;
  approvalRequest.decidedAt = new Date();
  if (rejectionReason) approvalRequest.rejectionReason = rejectionReason;

  await approvalRequest.save();

  // Resume or cancel ticket based on decision
  const ticket = await MaintenanceRequest.findById(approvalRequest.requestId);
  if (ticket) {
    const fromStatus = ticket.status;
    const newStatus = decision === 'approved' ? 'in_progress' : 'cancelled';
    ticket.status = newStatus;
    await ticket.save();

    appEventBus.emit(DOMAIN_EVENTS.TICKET_STATUS_CHANGED, {
      request: ticket,
      fromStatus,
      toStatus: newStatus,
      actorUser: decidingUser,
    });
  }

  appEventBus.emit(DOMAIN_EVENTS.APPROVAL_DECIDED, {
    approvalRequest,
    actorUser: decidingUser,
  });

  return approvalRequest;
};

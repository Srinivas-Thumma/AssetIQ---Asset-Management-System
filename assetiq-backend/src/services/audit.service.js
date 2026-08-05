import { AuditLog } from '../models/AuditLog.js';
import { appEventBus, DOMAIN_EVENTS } from '../events/AppEventBus.js';

export const recordAuditLog = async ({
  organizationId,
  entityType,
  entityId,
  action,
  actorUser = null,
  changes = {},
  metadata = {},
}) => {
  try {
    await AuditLog.create({
      organizationId,
      entityType,
      entityId,
      action,
      actorId: actorUser ? actorUser._id : null,
      actorName: actorUser ? (actorUser.email ? actorUser.email.split('@')[0] : actorUser.name || 'User') : 'System',
      actorRole: actorUser ? actorUser.role : 'system',
      changes,
      metadata,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error('⚠️ AuditService: Failed to record audit log:', err.message);
  }
};

// EventBus Subscribers: Listen to domain events and auto-write to AuditLog
appEventBus.on(DOMAIN_EVENTS.TICKET_CREATED, async ({ request, actorUser }) => {
  await recordAuditLog({
    organizationId: request.organizationId,
    entityType: 'ticket',
    entityId: request._id,
    action: 'TICKET_CREATED',
    actorUser,
    metadata: { ticketCode: request._id, type: request.type, priority: request.priority },
  });
});

appEventBus.on(DOMAIN_EVENTS.TICKET_STATUS_CHANGED, async ({ request, fromStatus, toStatus, actorUser }) => {
  await recordAuditLog({
    organizationId: request.organizationId,
    entityType: 'ticket',
    entityId: request._id,
    action: 'TICKET_STATUS_CHANGED',
    actorUser,
    changes: { from: fromStatus, to: toStatus },
  });
});

appEventBus.on(DOMAIN_EVENTS.APPROVAL_REQUESTED, async ({ approvalRequest, actorUser }) => {
  await recordAuditLog({
    organizationId: approvalRequest.organizationId,
    entityType: 'approval',
    entityId: approvalRequest._id,
    action: 'APPROVAL_REQUESTED',
    actorUser,
    metadata: { amount: approvalRequest.amount, requestId: approvalRequest.requestId },
  });
});

appEventBus.on(DOMAIN_EVENTS.APPROVAL_DECIDED, async ({ approvalRequest, actorUser }) => {
  await recordAuditLog({
    organizationId: approvalRequest.organizationId,
    entityType: 'approval',
    entityId: approvalRequest._id,
    action: `APPROVAL_${approvalRequest.status.toUpperCase()}`,
    actorUser,
    metadata: { amount: approvalRequest.amount, requestId: approvalRequest.requestId },
  });
});

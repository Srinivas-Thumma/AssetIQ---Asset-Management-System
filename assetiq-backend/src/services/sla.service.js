import { SlaPolicy } from '../models/SlaPolicy.js';
import { SlaInstance } from '../models/SlaInstance.js';
import { appEventBus, DOMAIN_EVENTS } from '../events/AppEventBus.js';

const DEFAULT_TARGETS = {
  critical: { response: 0.5, resolution: 2 },   // 30 mins, 2 hrs
  high: { response: 1, resolution: 8 },         // 1 hr, 8 hrs
  medium: { response: 4, resolution: 24 },       // 4 hrs, 24 hrs
  low: { response: 8, resolution: 48 },          // 8 hrs, 48 hrs
};

export const attachSlaToTicket = async (ticket) => {
  try {
    const priorityKey = (ticket.priority || 'medium').toLowerCase();

    // Check custom policy or fallback to standard SLA targets
    let policy = await SlaPolicy.findOne({
      organizationId: ticket.organizationId,
      priority: priorityKey,
      isActive: true,
    });

    const respHours = policy ? policy.responseTargetHours : DEFAULT_TARGETS[priorityKey].response;
    const resHours = policy ? policy.resolutionTargetHours : DEFAULT_TARGETS[priorityKey].resolution;

    const now = new Date();
    const responseDeadline = new Date(now.getTime() + respHours * 60 * 60 * 1000);
    const resolutionDeadline = new Date(now.getTime() + resHours * 60 * 60 * 1000);

    const instance = await SlaInstance.create({
      organizationId: ticket.organizationId,
      requestId: ticket._id,
      priority: priorityKey,
      responseDeadline,
      resolutionDeadline,
    });

    return instance;
  } catch (err) {
    console.error('⚠️ SlaService: Failed to attach SLA to ticket:', err.message);
    return null;
  }
};

export const checkSlaBreaches = async () => {
  const now = new Date();

  // Query un-responded, un-breached instances past responseDeadline
  const responseBreaches = await SlaInstance.find({
    respondedAt: null,
    isResponseBreached: false,
    responseDeadline: { $lt: now },
  });

  for (const instance of responseBreaches) {
    instance.isResponseBreached = true;
    await instance.save();

    appEventBus.emit(DOMAIN_EVENTS.SLA_BREACHED, {
      instance,
      breachType: 'RESPONSE',
    });
  }

  // Query un-resolved, un-breached instances past resolutionDeadline
  const resolutionBreaches = await SlaInstance.find({
    resolvedAt: null,
    isResolutionBreached: false,
    resolutionDeadline: { $lt: now },
  });

  for (const instance of resolutionBreaches) {
    instance.isResolutionBreached = true;
    await instance.save();

    appEventBus.emit(DOMAIN_EVENTS.SLA_BREACHED, {
      instance,
      breachType: 'RESOLUTION',
    });
  }
};

// EventBus Subscribers
appEventBus.on(DOMAIN_EVENTS.TICKET_CREATED, async ({ request }) => {
  await attachSlaToTicket(request);
});

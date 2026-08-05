import { EventEmitter } from 'events';

/**
 * Global App Event Bus (Node.js EventEmitter):
 * Decouples core service operations (ticket creation, status updates, message posts)
 * from side-effect subscribers (Audit Logging, Timeline generation, Notifications, Socket updates).
 */
class AppEventBus extends EventEmitter {}

export const appEventBus = new AppEventBus();

// Standard Domain Event Constants
export const DOMAIN_EVENTS = {
  TICKET_CREATED: 'TICKET_CREATED',
  TICKET_STATUS_CHANGED: 'TICKET_STATUS_CHANGED',
  APPROVAL_REQUESTED: 'APPROVAL_REQUESTED',
  APPROVAL_DECIDED: 'APPROVAL_DECIDED',
  MESSAGE_POSTED: 'MESSAGE_POSTED',
  WARRANTY_EXPIRING: 'WARRANTY_EXPIRING',
  SLA_BREACHED: 'SLA_BREACHED',
  ASSET_HEALTH_UPDATED: 'ASSET_HEALTH_UPDATED',
};

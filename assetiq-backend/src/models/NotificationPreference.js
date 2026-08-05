import mongoose from 'mongoose';
import { tenantScopePlugin } from './plugins/tenantScope.plugin.js';

const notificationPreferenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    assignedTickets: { type: Boolean, default: true },
    mentions: { type: Boolean, default: true },
    approvals: { type: Boolean, default: true },
    chatMessages: { type: Boolean, default: true },
    warrantyAlerts: { type: Boolean, default: true },
    maintenanceDue: { type: Boolean, default: true },
  },
  { timestamps: true }
);

notificationPreferenceSchema.index({ organizationId: 1, userId: 1 }, { unique: true });

notificationPreferenceSchema.plugin(tenantScopePlugin);

export const NotificationPreference = mongoose.model('NotificationPreference', notificationPreferenceSchema);

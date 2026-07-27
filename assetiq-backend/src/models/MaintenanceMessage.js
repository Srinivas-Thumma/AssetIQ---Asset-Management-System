import mongoose from 'mongoose';
import { tenantScopePlugin } from './plugins/tenantScope.plugin.js';

const maintenanceMessageSchema = new mongoose.Schema(
  {
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MaintenanceRequest',
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderName: {
      type: String,
      required: true,
      trim: true,
    },
    senderRole: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

maintenanceMessageSchema.index({ organizationId: 1, requestId: 1, createdAt: 1 });
maintenanceMessageSchema.plugin(tenantScopePlugin);

export const MaintenanceMessage = mongoose.model('MaintenanceMessage', maintenanceMessageSchema);

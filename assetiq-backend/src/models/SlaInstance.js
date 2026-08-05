import mongoose from 'mongoose';
import { tenantScopePlugin } from './plugins/tenantScope.plugin.js';

const slaInstanceSchema = new mongoose.Schema(
  {
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MaintenanceRequest',
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      required: true,
    },
    responseDeadline: {
      type: Date,
      required: true,
    },
    resolutionDeadline: {
      type: Date,
      required: true,
    },
    isResponseBreached: {
      type: Boolean,
      default: false,
      index: true,
    },
    isResolutionBreached: {
      type: Boolean,
      default: false,
      index: true,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

slaInstanceSchema.index({ organizationId: 1, isResolutionBreached: 1 });

slaInstanceSchema.plugin(tenantScopePlugin);

export const SlaInstance = mongoose.model('SlaInstance', slaInstanceSchema);

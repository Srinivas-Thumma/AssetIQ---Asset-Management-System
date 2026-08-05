import mongoose from 'mongoose';
import { tenantScopePlugin } from './plugins/tenantScope.plugin.js';

const slaPolicySchema = new mongoose.Schema(
  {
    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      required: true,
    },
    responseTargetHours: {
      type: Number,
      required: true,
    },
    resolutionTargetHours: {
      type: Number,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

slaPolicySchema.index({ organizationId: 1, priority: 1 }, { unique: true });

slaPolicySchema.plugin(tenantScopePlugin);

export const SlaPolicy = mongoose.model('SlaPolicy', slaPolicySchema);

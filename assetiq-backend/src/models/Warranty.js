import mongoose from 'mongoose';
import { tenantScopePlugin } from './plugins/tenantScope.plugin.js';

const warrantySchema = new mongoose.Schema(
  {
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      required: true,
      unique: true, // One warranty record per asset
    },
    provider: {
      type: String,
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'void'],
      default: 'active',
    },
    alertSent: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

warrantySchema.index({ organizationId: 1, endDate: 1 });
warrantySchema.plugin(tenantScopePlugin);

export const Warranty = mongoose.model('Warranty', warrantySchema);

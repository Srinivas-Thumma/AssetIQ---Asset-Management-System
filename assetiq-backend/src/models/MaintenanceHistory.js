import mongoose from 'mongoose';
import { tenantScopePlugin } from './plugins/tenantScope.plugin.js';

const maintenanceHistorySchema = new mongoose.Schema(
  {
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      required: true,
    },
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MaintenanceRequest',
      default: null,
    },
    date: {
      type: Date,
      default: Date.now,
      required: true,
    },
    cost: {
      type: Number,
      required: true,
      default: 0,
    },
    findings: {
      type: String,
      required: true,
    },
    actionsTaken: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

maintenanceHistorySchema.index({ organizationId: 1, assetId: 1 });
maintenanceHistorySchema.plugin(tenantScopePlugin);

export const MaintenanceHistory = mongoose.model(
  'MaintenanceHistory',
  maintenanceHistorySchema
);

import mongoose from 'mongoose';
import { tenantScopePlugin } from './plugins/tenantScope.plugin.js';

const maintenanceRequestSchema = new mongoose.Schema(
  {
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      required: true,
    },
    raisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['preventive', 'corrective'],
      required: true,
    },
    status: {
      type: String,
      enum: ['open', 'assigned', 'in_progress', 'resolved'],
      default: 'open',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    description: {
      type: String,
      required: true,
    },
    scheduledDate: {
      type: Date,
      required: true,
    },
    completedDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

maintenanceRequestSchema.index({ organizationId: 1, assetId: 1 });
maintenanceRequestSchema.index({ organizationId: 1, status: 1 });
maintenanceRequestSchema.plugin(tenantScopePlugin);

export const MaintenanceRequest = mongoose.model(
  'MaintenanceRequest',
  maintenanceRequestSchema
);

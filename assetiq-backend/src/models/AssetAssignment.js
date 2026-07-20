import mongoose from 'mongoose';
import { tenantScopePlugin } from './plugins/tenantScope.plugin.js';

const assetAssignmentSchema = new mongoose.Schema(
  {
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      required: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    returnedAt: {
      type: Date,
      default: null,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

assetAssignmentSchema.index({ organizationId: 1, assetId: 1 });
assetAssignmentSchema.index({ organizationId: 1, employeeId: 1 });
assetAssignmentSchema.plugin(tenantScopePlugin);

export const AssetAssignment = mongoose.model(
  'AssetAssignment',
  assetAssignmentSchema
);

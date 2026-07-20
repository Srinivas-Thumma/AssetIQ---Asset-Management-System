import mongoose from 'mongoose';
import { tenantScopePlugin } from './plugins/tenantScope.plugin.js';

const buildingSchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

buildingSchema.index({ organizationId: 1, branchId: 1, code: 1 }, { unique: true });
buildingSchema.plugin(tenantScopePlugin);

export const Building = mongoose.model('Building', buildingSchema);

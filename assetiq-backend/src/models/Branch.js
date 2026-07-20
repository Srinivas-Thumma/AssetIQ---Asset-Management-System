import mongoose from 'mongoose';
import { tenantScopePlugin } from './plugins/tenantScope.plugin.js';

const branchSchema = new mongoose.Schema(
  {
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

branchSchema.index({ organizationId: 1, code: 1 }, { unique: true });
branchSchema.plugin(tenantScopePlugin);

export const Branch = mongoose.model('Branch', branchSchema);

import mongoose from 'mongoose';
import { tenantScopePlugin } from './plugins/tenantScope.plugin.js';

const departmentSchema = new mongoose.Schema(
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

departmentSchema.index({ organizationId: 1, code: 1 }, { unique: true });
departmentSchema.plugin(tenantScopePlugin);

export const Department = mongoose.model('Department', departmentSchema);

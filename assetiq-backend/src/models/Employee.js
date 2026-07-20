import mongoose from 'mongoose';
import { tenantScopePlugin } from './plugins/tenantScope.plugin.js';

const employeeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    employeeId: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
    },
  },
  { timestamps: true }
);

employeeSchema.index({ organizationId: 1, employeeId: 1 }, { unique: true });
employeeSchema.plugin(tenantScopePlugin);

export const Employee = mongoose.model('Employee', employeeSchema);

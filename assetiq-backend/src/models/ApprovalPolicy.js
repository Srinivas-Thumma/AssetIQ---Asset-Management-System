import mongoose from 'mongoose';
import { tenantScopePlugin } from './plugins/tenantScope.plugin.js';

const approvalStepSchema = new mongoose.Schema(
  {
    stepNumber: { type: Number, required: true },
    requiredRole: {
      type: String,
      enum: ['asset_manager', 'org_admin', 'super_admin'],
      required: true,
    },
    approverUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { _id: false }
);

const approvalPolicySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    minimumAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    maximumAmount: {
      type: Number,
      default: Infinity,
    },
    autoApproveBelow: {
      type: Number,
      default: 0,
    },
    steps: [approvalStepSchema],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

approvalPolicySchema.index({ organizationId: 1, minimumAmount: 1 });

approvalPolicySchema.plugin(tenantScopePlugin);

export const ApprovalPolicy = mongoose.model('ApprovalPolicy', approvalPolicySchema);

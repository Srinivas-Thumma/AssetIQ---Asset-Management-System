import mongoose from 'mongoose';
import { tenantScopePlugin } from './plugins/tenantScope.plugin.js';

const supportTicketSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['platform_support', 'internal'],
      required: true,
      index: true,
    },
    raisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      required: false,
      index: true,
    },
    issueType: {
      type: String,
      enum: ['hardware_damage', 'software_issue', 'lost_stolen', 'general'],
      default: 'hardware_damage',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true,
    },
    estimatedCost: {
      type: Number,
      default: 0,
    },
    vendorName: {
      type: String,
      trim: true,
      default: '',
    },
    scheduledDate: {
      type: Date,
      default: null,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved'],
      default: 'open',
      index: true,
    },
  },
  { timestamps: true }
);

supportTicketSchema.index({ organizationId: 1, type: 1, raisedBy: 1, recipientId: 1, assetId: 1 });

supportTicketSchema.plugin(tenantScopePlugin);

export const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);

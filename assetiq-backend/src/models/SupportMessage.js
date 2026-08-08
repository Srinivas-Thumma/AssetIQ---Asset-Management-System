import mongoose from 'mongoose';
import { tenantScopePlugin } from './plugins/tenantScope.plugin.js';

const supportMessageSchema = new mongoose.Schema(
  {
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SupportTicket',
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    senderRole: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    isSystemEvent: {
      type: Boolean,
      default: false,
    },
    systemEventType: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

supportMessageSchema.index({ organizationId: 1, ticketId: 1, createdAt: 1 });

supportMessageSchema.plugin(tenantScopePlugin);

export const SupportMessage = mongoose.model('SupportMessage', supportMessageSchema);

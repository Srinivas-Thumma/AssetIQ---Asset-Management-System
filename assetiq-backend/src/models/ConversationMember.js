import mongoose from 'mongoose';
import { tenantScopePlugin } from './plugins/tenantScope.plugin.js';

const conversationMemberSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member',
    },
    lastReadAt: {
      type: Date,
      default: Date.now,
    },
    isMuted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

conversationMemberSchema.index({ organizationId: 1, conversationId: 1, userId: 1 }, { unique: true });

conversationMemberSchema.plugin(tenantScopePlugin);

export const ConversationMember = mongoose.model('ConversationMember', conversationMemberSchema);

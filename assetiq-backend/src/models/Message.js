import mongoose from 'mongoose';
import { tenantScopePlugin } from './plugins/tenantScope.plugin.js';

const reactionSchema = new mongoose.Schema(
  {
    emoji: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { _id: false, timestamps: true }
);

const attachmentSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    url: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
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
    },
    isInternalNote: {
      type: Boolean,
      default: false,
      index: true,
    },
    mentions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    attachments: [attachmentSchema],
    reactions: [reactionSchema],
  },
  { timestamps: true }
);

messageSchema.index({ organizationId: 1, conversationId: 1, createdAt: 1 });
messageSchema.index({ organizationId: 1, isInternalNote: 1 });

messageSchema.plugin(tenantScopePlugin);

export const Message = mongoose.model('Message', messageSchema);

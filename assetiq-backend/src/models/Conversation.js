import mongoose from 'mongoose';
import { tenantScopePlugin } from './plugins/tenantScope.plugin.js';

const conversationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['maintenance', 'channel', 'direct', 'approval', 'vendor', 'system'],
      required: true,
      index: true,
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    name: {
      type: String,
      default: null,
    },
    description: {
      type: String,
      default: null,
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: Map,
      of: String,
      default: {},
    },
  },
  { timestamps: true }
);

conversationSchema.index({ organizationId: 1, type: 1, relatedId: 1 });

conversationSchema.plugin(tenantScopePlugin);

export const Conversation = mongoose.model('Conversation', conversationSchema);

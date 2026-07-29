import mongoose from 'mongoose';
import { tenantScopePlugin } from './plugins/tenantScope.plugin.js';

const notificationSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    message: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['warranty_expiring', 'maintenance_due', 'chat_message'],
      required: true
    },
    read: {
      type: Boolean,
      default: false,
      index: true
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    }
  },
  { timestamps: true }
);

// TTL index to auto-delete read notifications after 30 days (2,592,000 seconds)
notificationSchema.index(
  { createdAt: 1 }, 
  { expireAfterSeconds: 2592000, partialFilterExpression: { read: true } }
);

notificationSchema.plugin(tenantScopePlugin);

export const Notification = mongoose.model('Notification', notificationSchema);

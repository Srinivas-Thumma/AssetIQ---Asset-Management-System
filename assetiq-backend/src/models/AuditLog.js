import mongoose from 'mongoose';
import { tenantScopePlugin } from './plugins/tenantScope.plugin.js';

const auditLogSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      enum: ['ticket', 'asset', 'user', 'approval', 'system', 'conversation'],
      required: true,
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    actorName: {
      type: String,
      default: 'System',
    },
    actorRole: {
      type: String,
      default: 'system',
    },
    changes: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: false }
);

auditLogSchema.index({ organizationId: 1, entityType: 1, entityId: 1, timestamp: -1 });

auditLogSchema.plugin(tenantScopePlugin);

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);

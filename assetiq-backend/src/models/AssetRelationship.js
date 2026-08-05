import mongoose from 'mongoose';
import { tenantScopePlugin } from './plugins/tenantScope.plugin.js';

const assetRelationshipSchema = new mongoose.Schema(
  {
    parentAssetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      required: true,
      index: true,
    },
    childAssetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      required: true,
      index: true,
    },
    relationshipType: {
      type: String,
      enum: ['contains', 'depends_on', 'powered_by', 'connected_to'],
      default: 'contains',
    },
  },
  { timestamps: true }
);

assetRelationshipSchema.index({ organizationId: 1, parentAssetId: 1, childAssetId: 1 }, { unique: true });

assetRelationshipSchema.plugin(tenantScopePlugin);

export const AssetRelationship = mongoose.model('AssetRelationship', assetRelationshipSchema);

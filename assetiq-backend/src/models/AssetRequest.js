import mongoose from 'mongoose';
import { tenantScopePlugin } from './plugins/tenantScope.plugin.js';

const assetRequestSchema = new mongoose.Schema({
  requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', default: null }, // Null if generic category request
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  targetEmployeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null }, // For peer transfer
  type: { type: String, enum: ['new_request', 'transfer'], required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  notes: { type: String, trim: true },
  reviewerNotes: { type: String, trim: true, default: '' }
}, { timestamps: true });

assetRequestSchema.plugin(tenantScopePlugin);
export const AssetRequest = mongoose.model('AssetRequest', assetRequestSchema);
export default AssetRequest;

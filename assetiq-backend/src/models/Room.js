import mongoose from 'mongoose';
import { tenantScopePlugin } from './plugins/tenantScope.plugin.js';

const roomSchema = new mongoose.Schema(
  {
    floorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Floor',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

roomSchema.index({ organizationId: 1, floorId: 1, code: 1 }, { unique: true });
roomSchema.plugin(tenantScopePlugin);

export const Room = mongoose.model('Room', roomSchema);

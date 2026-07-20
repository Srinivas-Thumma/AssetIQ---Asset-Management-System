import mongoose from 'mongoose';
import { tenantScopePlugin } from './plugins/tenantScope.plugin.js';

const floorSchema = new mongoose.Schema(
  {
    buildingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Building',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    number: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

floorSchema.index({ organizationId: 1, buildingId: 1, number: 1 }, { unique: true });
floorSchema.plugin(tenantScopePlugin);

export const Floor = mongoose.model('Floor', floorSchema);

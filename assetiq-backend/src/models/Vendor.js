import mongoose from 'mongoose';
import { tenantScopePlugin } from './plugins/tenantScope.plugin.js';

const vendorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    contactEmail: {
      type: String,
    },
    phone: {
      type: String,
    },
    address: {
      type: String,
    },
  },
  { timestamps: true }
);

vendorSchema.plugin(tenantScopePlugin);

export const Vendor = mongoose.model('Vendor', vendorSchema);

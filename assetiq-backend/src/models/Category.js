import mongoose from 'mongoose';
import { tenantScopePlugin } from './plugins/tenantScope.plugin.js';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      required: true,
    },
    customAttributes: [{
      key: { type: String, required: true },
      label: { type: String, required: true },
      dataType: { type: String, enum: ['text', 'number', 'date'], default: 'text' },
      required: { type: Boolean, default: false }
    }]
  },
  { timestamps: true }
);

categorySchema.index({ organizationId: 1, code: 1 }, { unique: true });
categorySchema.plugin(tenantScopePlugin);

export const Category = mongoose.model('Category', categorySchema);

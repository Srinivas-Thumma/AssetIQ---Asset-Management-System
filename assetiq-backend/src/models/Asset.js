import mongoose from 'mongoose';
import { tenantScopePlugin } from './plugins/tenantScope.plugin.js';

const assetSchema = new mongoose.Schema(
  {
    assetCode: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    status: {
      type: String,
      enum: ['available', 'assigned', 'under_maintenance', 'retired', 'damaged'],
      default: 'available',
    },
    purchaseDate: {
      type: Date,
      required: true,
    },
    purchasePrice: {
      type: Number,
      required: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
    },
    qrCode: {
      type: String, // Data URL representing the QR code PNG
    },
    ai: {
      healthScore: {
        type: Number,
        default: 100, // Starts at 100
      },
      lastAnalyzedAt: {
        type: Date,
        default: null,
      },
      insights: {
        type: [String],
        default: [],
      },
      predictedNextMaintenanceDate: {
        type: Date,
        default: null,
      },
      failureRiskPercent: {
        type: Number,
        default: 0,
      },
      remainingUsefulLifeMonths: {
        type: Number,
        default: null,
      },
      replacementRecommendation: {
        type: String,
        default: null,
      },
      priority: {
        type: String,
        default: null,
      },
    },
    customValues: {
      type: Map,
      of: String,
      default: {},
    },
  },
  { timestamps: true }
);

// Compound indexes for speed and uniqueness
assetSchema.index({ organizationId: 1, assetCode: 1 }, { unique: true });
assetSchema.index({ organizationId: 1, status: 1 });
assetSchema.index({ organizationId: 1, assignedTo: 1 });

assetSchema.plugin(tenantScopePlugin);

export const Asset = mongoose.model('Asset', assetSchema);

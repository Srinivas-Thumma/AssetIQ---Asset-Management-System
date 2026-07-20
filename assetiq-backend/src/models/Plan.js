import mongoose from 'mongoose';

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    price: {
      type: Number,
      required: true,
      default: 0,
    },
    maxAssets: {
      type: Number,
      required: true,
      default: 100, // e.g. Free plan limit
    },
  },
  { timestamps: true }
);

export const Plan = mongoose.model('Plan', planSchema);

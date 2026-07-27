import mongoose from 'mongoose';

const platformBannerSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  type: { type: String, enum: ['info', 'warning', 'maintenance', 'success'], default: 'info' },
  isActive: { type: Boolean, default: true },
  expiresAt: { type: Date, default: null }
}, { timestamps: true });

export const PlatformBanner = mongoose.model('PlatformBanner', platformBannerSchema);
export default PlatformBanner;

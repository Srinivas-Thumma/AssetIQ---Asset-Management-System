import PlatformBanner from '../models/PlatformBanner.js';
import { sendResponse } from '../utils/apiResponse.js';

export const getActiveBanner = async (req, res, next) => {
  try {
    const banner = await PlatformBanner.findOne({ isActive: true }).sort({ createdAt: -1 });
    return sendResponse(res, 200, true, 'Active platform banner retrieved', banner);
  } catch (error) {
    next(error);
  }
};

export const createBanner = async (req, res, next) => {
  try {
    const { title, message, type, expiresAt } = req.body;
    // Deactivate previous active banners if creating a new one
    await PlatformBanner.updateMany({}, { isActive: false });

    const newBanner = await PlatformBanner.create({
      title,
      message,
      type: type || 'info',
      isActive: true,
      expiresAt: expiresAt || null
    });

    return sendResponse(res, 201, true, 'Platform banner created', newBanner);
  } catch (error) {
    next(error);
  }
};

import { Warranty } from '../models/Warranty.js';
import { Asset } from '../models/Asset.js';
import { sendResponse } from '../utils/apiResponse.js';

export const getWarranties = async (req, res, next) => {
  try {
    const list = await Warranty.find().populate('assetId');
    return sendResponse(res, 200, true, 'Warranties retrieved', list);
  } catch (error) {
    next(error);
  }
};

export const createWarranty = async (req, res, next) => {
  try {
    const { assetId, provider, startDate, endDate } = req.body;
    if (!assetId || !provider || !startDate || !endDate) {
      return sendResponse(res, 400, false, 'assetId, provider, startDate, and endDate are required');
    }

    const assetExists = await Asset.findById(assetId);
    if (!assetExists) {
      return sendResponse(res, 404, false, 'Associated asset not found');
    }

    // Check if warranty already exists for asset
    const existing = await Warranty.findOne({ assetId });
    if (existing) {
      return sendResponse(res, 400, false, 'Warranty already exists for this asset. Please update it instead.');
    }

    const warranty = await Warranty.create({
      assetId,
      provider,
      startDate,
      endDate,
    });

    return sendResponse(res, 201, true, 'Warranty created successfully', warranty);
  } catch (error) {
    next(error);
  }
};

export const getExpiringWarranties = async (req, res, next) => {
  try {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const today = new Date();

    const list = await Warranty.find({
      endDate: { $gte: today, $lte: thirtyDaysFromNow },
    }).populate('assetId');

    return sendResponse(res, 200, true, 'Expiring warranties retrieved', list);
  } catch (error) {
    next(error);
  }
};

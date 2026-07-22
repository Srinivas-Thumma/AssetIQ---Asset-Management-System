import { Asset } from '../models/Asset.js';
import { AssetAssignment } from '../models/AssetAssignment.js';
import { MaintenanceHistory } from '../models/MaintenanceHistory.js';
import { Organization } from '../models/Organization.js';
import { Category } from '../models/Category.js';
import { Room } from '../models/Room.js';
import { Vendor } from '../models/Vendor.js';
import { generateAssetQR } from '../services/qr.service.js';
import { analyzeAssetHealth } from '../services/ai.service.js';
import { sendResponse } from '../utils/apiResponse.js';


export const getAssets = async (req, res, next) => {
  try {
    console.log("req.orgId:", req.orgId);
    console.log("req.user:", req.user);

    const { status, categoryId, roomId, assignedTo, search } = req.query;
    const filter = {};

    // Restrict employees to only see assets assigned to them
    if (req.user.role === 'employee') {
      filter.assignedTo = req.user.employeeRef;
    } else if (assignedTo) {
      filter.assignedTo = assignedTo === 'null' ? null : assignedTo;
    }

    if (status) filter.status = status;
    if (categoryId) filter.categoryId = categoryId;
    if (roomId) filter.roomId = roomId;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { assetCode: { $regex: search, $options: 'i' } }
      ];
    }

    const assets = await Asset.find(filter)
      .populate('categoryId')
      .populate({
        path: 'roomId',
        populate: {
          path: 'floorId',
          populate: {
            path: 'buildingId',
            populate: { path: 'branchId' }
          }
        }
      })
      .populate('assignedTo')
      .populate('vendorId')
      .sort({ createdAt: -1 });

    return sendResponse(res, 200, true, 'Assets retrieved successfully', assets);
  } catch (error) {
    next(error);
  }
};

export const getAssetById = async (req, res, next) => {
  try {
    const asset = await Asset.findById(req.params.id)
      .populate('categoryId')
      .populate({
        path: 'roomId',
        populate: {
          path: 'floorId',
          populate: {
            path: 'buildingId',
            populate: { path: 'branchId' }
          }
        }
      })
      .populate('assignedTo')
      .populate('vendorId');

    if (!asset) {
      return sendResponse(res, 404, false, 'Asset not found');
    }

    return sendResponse(res, 200, true, 'Asset retrieved successfully', asset);
  } catch (error) {
    next(error);
  }
};

export const createAsset = async (req, res, next) => {
  try {
    const {
      assetCode,
      name,
      categoryId,
      roomId,
      purchaseDate,
      purchasePrice,
      vendorId,
    } = req.body;

    if (!assetCode || !name || !categoryId || !roomId || !purchaseDate || !purchasePrice || !vendorId) {
      return sendResponse(res, 400, false, 'All fields are required');
    }

    // 1. Plan Limit Enforcement
    // Load the organization and check its plan asset limit
 console.log("req.orgId:", req.orgId);

const org = await Organization.findById(req.orgId).populate("planId");

console.log("Organization:", org);
    if (!org) {
      return sendResponse(res, 400, false, 'Organization context not found');
    }

    const planLimit = org.planId ? org.planId.maxAssets : 100;
    const activeAssetCount = await Asset.countDocuments({ status: { $ne: 'retired' } });

    if (activeAssetCount >= planLimit) {
      return sendResponse(
        res,
        400,
        false,
        `SaaS Plan Limit Reached: Your current plan allows a maximum of ${planLimit} assets. Please upgrade your plan.`
      );
    }

    // Check if assetCode is unique for this organization
    const existingAsset = await Asset.findOne({ assetCode });
    if (existingAsset) {
      return sendResponse(res, 400, false, 'Asset code already exists in this organization');
    }

    // Verify foreign keys exist
    const categoryExists = await Category.findById(categoryId);
    const roomExists = await Room.findById(roomId);
    const vendorExists = await Vendor.findById(vendorId);

    if (!categoryExists || !roomExists || !vendorExists) {
      return sendResponse(res, 400, false, 'Invalid Category, Room, or Vendor ID');
    }

    // 2. Create base asset
    const asset = new Asset({
      assetCode,
      name,
      categoryId,
      roomId,
      purchaseDate,
      purchasePrice,
      vendorId,
      status: 'available',
    });

    // Save initial document to generate _id
    await asset.save();

    // 3. Generate QR code deep link
    const qrCodeDataUrl = await generateAssetQR(asset._id);
    asset.qrCode = qrCodeDataUrl;

    // 4. Initial AI health analysis
    const initialAiResult = await analyzeAssetHealth(asset, true);
    asset.ai = {
      healthScore: initialAiResult.healthScore,
      insights: initialAiResult.insights,
      lastAnalyzedAt: initialAiResult.lastAnalyzedAt,
    };

    await asset.save();

    return sendResponse(res, 201, true, 'Asset created and indexed successfully', asset);
  } catch (error) {
    next(error);
  }
};

export const updateAsset = async (req, res, next) => {
  try {
    const { name, categoryId, roomId, purchasePrice, vendorId, status } = req.body;
    
    const asset = await Asset.findById(req.params.id);
    if (!asset) {
      return sendResponse(res, 404, false, 'Asset not found');
    }

    if (name) asset.name = name;
    if (categoryId) asset.categoryId = categoryId;
    if (roomId) asset.roomId = roomId;
    if (purchasePrice) asset.purchasePrice = purchasePrice;
    if (vendorId) asset.vendorId = vendorId;
    if (status) asset.status = status;

    await asset.save();

    return sendResponse(res, 200, true, 'Asset updated successfully', asset);
  } catch (error) {
    next(error);
  }
};

export const deleteAsset = async (req, res, next) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) {
      return sendResponse(res, 404, false, 'Asset not found');
    }

    // Mark as retired instead of hard deletion to preserve history logs
    asset.status = 'retired';
    await asset.save();

    return sendResponse(res, 200, true, 'Asset retired successfully', asset);
  } catch (error) {
    next(error);
  }
};

// --- Asset Assignments ---
export const assignAsset = async (req, res, next) => {
  try {
    const { employeeId } = req.body;
    if (!employeeId) {
      return sendResponse(res, 400, false, 'Employee ID is required');
    }

    const asset = await Asset.findById(req.params.id);
    if (!asset) {
      return sendResponse(res, 404, false, 'Asset not found');
    }

    if (asset.status !== 'available') {
      return sendResponse(res, 400, false, `Asset is currently not available for assignment (Status: ${asset.status})`);
    }

    // Update Asset State
    asset.status = 'assigned';
    asset.assignedTo = employeeId;
    await asset.save();

    // Log Asset Assignment
    const log = await AssetAssignment.create({
      assetId: asset._id,
      employeeId,
      assignedBy: req.user._id,
      assignedAt: new Date(),
    });

    return sendResponse(res, 200, true, 'Asset assigned successfully', { asset, assignmentLog: log });
  } catch (error) {
    next(error);
  }
};

export const returnAsset = async (req, res, next) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) {
      return sendResponse(res, 404, false, 'Asset not found');
    }

    if (asset.status !== 'assigned' || !asset.assignedTo) {
      return sendResponse(res, 400, false, 'Asset is not currently assigned to any employee');
    }

    const oldEmployeeId = asset.assignedTo;

    // Update Asset State
    asset.status = 'available';
    asset.assignedTo = null;
    await asset.save();

    // Close Assignment Log
    const openLog = await AssetAssignment.findOne({
      assetId: asset._id,
      employeeId: oldEmployeeId,
      returnedAt: null,
    });

    if (openLog) {
      openLog.returnedAt = new Date();
      await openLog.save();
    }

    return sendResponse(res, 200, true, 'Asset returned successfully', asset);
  } catch (error) {
    next(error);
  }
};

// --- History Logs ---
export const getAssetHistory = async (req, res, next) => {
  try {
    const assetId = req.params.id;

    const assignments = await AssetAssignment.find({ assetId })
      .populate('employeeId')
      .populate('assignedBy')
      .sort({ assignedAt: -1 });

    const maintenance = await MaintenanceHistory.find({ assetId })
      .populate('requestId')
      .sort({ date: -1 });

    return sendResponse(res, 200, true, 'Asset history logs retrieved', {
      assignments,
      maintenance,
    });
  } catch (error) {
    next(error);
  }
};

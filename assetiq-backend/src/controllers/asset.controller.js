import { Asset } from '../models/Asset.js';
import { AssetAssignment } from '../models/AssetAssignment.js';
import { MaintenanceHistory } from '../models/MaintenanceHistory.js';
import { MaintenanceRequest } from '../models/MaintenanceRequest.js';
import { Warranty } from '../models/Warranty.js';
import { Organization } from '../models/Organization.js';
import { Category } from '../models/Category.js';
import { Room } from '../models/Room.js';
import { Vendor } from '../models/Vendor.js';
import { generateAssetQR } from '../services/qr.service.js';
import { analyzeAssetHealth } from '../services/ai.service.js';
import { sendResponse } from '../utils/apiResponse.js';


export const getAssets = async (req, res, next) => {
  try {
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
      .sort({ createdAt: -1 }); // newest first

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

    const org = await Organization.findById(req.orgId).populate("planId");
    if (!org) {
      return sendResponse(res, 400, false, 'Organization not found or invalid context.');
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
      predictedNextMaintenanceDate: initialAiResult.predictedNextMaintenanceDate || null,
      failureRiskPercent: initialAiResult.failureRiskPercent || 0,
      remainingUsefulLifeMonths: initialAiResult.remainingUsefulLifeMonths ?? null,
      replacementRecommendation: initialAiResult.replacementRecommendation ?? null,
      priority: initialAiResult.priority ?? null,
    };

    await asset.save();

    return sendResponse(res, 201, true, 'Asset created and indexed successfully', asset);
  } catch (error) {
    next(error);
  }
};

/**
 * Updates asset metadata and manages status lifecycle transitions.
 * Lifecycle Rule (Option B):
 * - Setting `status = 'damaged'` keeps asset status as 'damaged' (reported broken) and auto-generates
 *   an open corrective MaintenanceRequest.
 * - Transition from 'damaged' to 'under_maintenance' occurs downstream when work begins (status becomes 'assigned' or 'in_progress').
 */
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
    if (status === 'damaged') {
      asset.status = 'damaged';

      const existingActiveTicket = await MaintenanceRequest.findOne({
        assetId: asset._id,
        status: { $in: ['open', 'in_progress', 'assigned'] }
      });

      if (!existingActiveTicket) {
        await MaintenanceRequest.create({
          organizationId: req.orgId || asset.organizationId,
          assetId: asset._id,
          raisedBy: req.user?._id || asset.organizationId,
          type: 'corrective',
          priority: 'high',
          description: `Auto-generated corrective maintenance request: Asset reported damaged (${asset.name}).`,
          scheduledDate: new Date(),
          status: 'open',
        });
      }
    } else if (status) {
      asset.status = status;
    }

    await asset.save();

    return sendResponse(res, 200, true, 'Asset updated successfully', asset);
  } catch (error) {
    next(error);
  }
};

/**
 * Deletes or retires an asset.
 * Hard-Delete Safety Guard:
 * Performs parallel checks across MaintenanceRequest, MaintenanceHistory, Warranty, and AssetAssignment.
 * Assets with any historical records cannot be hard-deleted to preserve audit integrity; they must be soft-retired (`mode=retire`).
 */
export const deleteAsset = async (req, res, next) => {
  try {
    const { mode } = req.query;
    const asset = await Asset.findById(req.params.id);
    if (!asset) {
      return sendResponse(res, 404, false, 'Asset not found');
    }

    if (mode === 'retire') {
      asset.status = 'retired';
      await asset.save();
      return sendResponse(res, 200, true, 'Asset status updated to retired', asset);
    }

    // Safety Guard: Block hard delete if maintenance, warranty, or assignment records exist
    const [hasMaintenanceReq, hasMaintenanceHist, hasWarranty, hasAssignment] = await Promise.all([
      MaintenanceRequest.exists({ assetId: asset._id }),
      MaintenanceHistory.exists({ assetId: asset._id }),
      Warranty.exists({ assetId: asset._id }),
      AssetAssignment.exists({ assetId: asset._id }),
    ]);

    if (hasMaintenanceReq || hasMaintenanceHist || hasWarranty || hasAssignment) {
      return sendResponse(
        res,
        400,
        false,
        'Cannot hard delete asset because maintenance, warranty, or custody assignment records are attached to it. Please use the Retire option instead.'
      );
    }

    // Permanent hard deletion
    await asset.deleteOne();
    return sendResponse(res, 200, true, 'Asset deleted successfully');
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
      organizationId: req.orgId,
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

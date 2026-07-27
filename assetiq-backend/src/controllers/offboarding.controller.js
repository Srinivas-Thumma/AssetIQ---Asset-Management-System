import { Asset } from '../models/Asset.js';
import { sendResponse } from '../utils/apiResponse.js';

export const getOffboardingChecklist = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const assets = await Asset.find({ assignedTo: employeeId, status: 'assigned' }).populate('categoryId', 'name');
    return sendResponse(res, 200, true, 'Checklist fetched', assets);
  } catch (error) {
    next(error);
  }
};

export const returnAllAssets = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    // Bulk update all assets assigned to this employee back to available
    const result = await Asset.updateMany(
      { assignedTo: employeeId, status: 'assigned' },
      { $set: { assignedTo: null, status: 'available' } }
    );
    return sendResponse(res, 200, true, `Successfully returned ${result.modifiedCount} assets`, result);
  } catch (error) {
    next(error);
  }
};

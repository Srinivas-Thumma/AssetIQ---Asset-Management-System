import { Asset } from '../models/Asset.js';
import { MaintenanceHistory } from '../models/MaintenanceHistory.js';
import { Branch } from '../models/Branch.js';
import { Building } from '../models/Building.js';
import { Category } from '../models/Category.js';
import { sendResponse } from '../utils/apiResponse.js';

export const getAssetSummaryReport = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.role === 'employee') {
      filter.assignedTo = req.user.employeeRef;
    }
    const assets = await Asset.find(filter);
    
    const summary = {
      total: assets.length,
      available: assets.filter(a => a.status === 'available').length,
      assigned: assets.filter(a => a.status === 'assigned').length,
      under_maintenance: assets.filter(a => a.status === 'under_maintenance').length,
      retired: assets.filter(a => a.status === 'retired').length,
      damaged: assets.filter(a => a.status === 'damaged').length,
    };

    // Calculate average health score
    const assetsWithHealth = assets.filter(a => a.ai && a.ai.healthScore !== undefined);
    const avgHealth = assetsWithHealth.length > 0
      ? Math.round(assetsWithHealth.reduce((acc, curr) => acc + curr.ai.healthScore, 0) / assetsWithHealth.length)
      : 100;

    summary.averageHealthScore = avgHealth;

    return sendResponse(res, 200, true, 'Asset summary report compiled', summary);
  } catch (error) {
    next(error);
  }
};

export const getMaintenanceCostReport = async (req, res, next) => {
  try {
    const history = await MaintenanceHistory.find().populate({
      path: 'assetId',
      populate: { path: 'categoryId' }
    });

    const categoryCostMap = {};
    const monthlyCostMap = {};
    let totalCost = 0;

    history.forEach((item) => {
      const cost = item.cost || 0;
      totalCost += cost;

      // Aggregate by category
      const categoryName = item.assetId?.categoryId?.name || 'Uncategorized';
      categoryCostMap[categoryName] = (categoryCostMap[categoryName] || 0) + cost;

      // Aggregate by month (YYYY-MM)
      const date = new Date(item.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyCostMap[monthKey] = (monthlyCostMap[monthKey] || 0) + cost;
    });

    // Format category cost for charts
    const categoryCost = Object.keys(categoryCostMap).map(key => ({
      category: key,
      cost: categoryCostMap[key]
    }));

    // Format monthly cost for charts (sort chronological)
    const monthlyCost = Object.keys(monthlyCostMap)
      .sort()
      .map(key => ({
        month: key,
        cost: monthlyCostMap[key]
      }));

    return sendResponse(res, 200, true, 'Maintenance cost report compiled', {
      totalCost,
      categoryCost,
      monthlyCost,
    });
  } catch (error) {
    next(error);
  }
};

export const getLocationReport = async (req, res, next) => {
  try {
    const assets = await Asset.find().populate({
      path: 'roomId',
      populate: {
        path: 'floorId',
        populate: { path: 'buildingId' }
      }
    });

    const locationCounts = {};

    assets.forEach((asset) => {
      const buildingName = asset.roomId?.floorId?.buildingId?.name || 'Unassigned Building';
      locationCounts[buildingName] = (locationCounts[buildingName] || 0) + 1;
    });

    const locationWise = Object.keys(locationCounts).map(key => ({
      location: key,
      assetsCount: locationCounts[key]
    }));

    return sendResponse(res, 200, true, 'Location-wise report compiled', locationWise);
  } catch (error) {
    next(error);
  }
};

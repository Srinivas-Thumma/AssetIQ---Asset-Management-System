import { Organization } from '../models/Organization.js';
import { User } from '../models/User.js';
import { Asset } from '../models/Asset.js';
import { Plan } from '../models/Plan.js';
import { sendResponse } from '../utils/apiResponse.js';

export const getOrganizations = async (req, res, next) => {
  try {
    const list = await Organization.find().populate('planId');
    return sendResponse(res, 200, true, 'All organizations retrieved', list);
  } catch (error) {
    next(error);
  }
};

export const updateOrganizationStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status || !['active', 'suspended'].includes(status)) {
      return sendResponse(res, 400, false, 'Invalid status. Must be active or suspended');
    }

    const org = await Organization.findById(req.params.id);
    if (!org) {
      return sendResponse(res, 404, false, 'Organization not found');
    }

    org.status = status;
    await org.save();

    return sendResponse(res, 200, true, `Organization status updated to ${status}`, org);
  } catch (error) {
    next(error);
  }
};

export const getPlatformAnalytics = async (req, res, next) => {
  try {
    // These execute globally without tenant scope since tenantStorage is not set
    const orgCount = await Organization.countDocuments();
    const userCount = await User.countDocuments();
    const assetCount = await Asset.countDocuments({ status: { $ne: 'retired' } });
    
    // Plan distribution
    const orgs = await Organization.find().populate('planId');
    const plansDistribution = {};

    orgs.forEach((org) => {
      const planName = org.planId ? org.planId.name : 'Unknown';
      plansDistribution[planName] = (plansDistribution[planName] || 0) + 1;
    });

    const planStats = Object.keys(plansDistribution).map(key => ({
      plan: key,
      count: plansDistribution[key]
    }));

    return sendResponse(res, 200, true, 'Platform analytics retrieved', {
      totalOrganizations: orgCount,
      totalUsers: userCount,
      totalAssets: assetCount,
      planDistribution: planStats,
    });
  } catch (error) {
    next(error);
  }
};

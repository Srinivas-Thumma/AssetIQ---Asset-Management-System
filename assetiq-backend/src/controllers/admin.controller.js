import { Organization } from '../models/Organization.js';
import { User } from '../models/User.js';
import { Asset } from '../models/Asset.js';
import { Plan } from '../models/Plan.js';
import { AiAuditLog } from '../models/AiAuditLog.js';
import { sendResponse } from '../utils/apiResponse.js';
import { runWithTenant } from '../utils/tenantContext.js';

export const getOrganizations = async (req, res, next) => {
  try {
    const list = await Organization.find().populate('planId');
    return sendResponse(res, 200, true, 'All organizations retrieved', list);
  } catch (error) {
    next(error);
  }
};

export const createOrganization = async (req, res, next) => {
  try {
    const { name, slug, planId, adminEmail, adminPassword } = req.body;
    if (!name || !slug || !planId || !adminEmail || !adminPassword) {
      return sendResponse(res, 400, false, 'name, slug, planId, adminEmail, and adminPassword are required');
    }

    // Check slug uniqueness
    const existingOrg = await Organization.findOne({ slug });
    if (existingOrg) {
      return sendResponse(res, 400, false, 'Organization slug is already taken');
    }

    const org = await Organization.create({
      name,
      slug,
      planId,
      status: 'active'
    });

    const orgIdString = org._id.toString();

    // Create default Admin User for this organization inside its tenant context
    await runWithTenant(orgIdString, async () => {
      await User.create({
        email: adminEmail,
        passwordHash: adminPassword,
        role: 'org_admin',
        organizationId: orgIdString
      });
    });

    const populatedOrg = await Organization.findById(org._id).populate('planId');
    return sendResponse(res, 201, true, 'Organization created manually', populatedOrg);
  } catch (err) {
    next(err);
  }
};

export const updateOrganization = async (req, res, next) => {
  try {
    const { status, planId } = req.body;
    const org = await Organization.findById(req.params.id);
    if (!org) {
      return sendResponse(res, 404, false, 'Organization not found');
    }

    if (status) {
      if (!['active', 'suspended'].includes(status)) {
        return sendResponse(res, 400, false, 'Invalid status. Must be active or suspended');
      }
      org.status = status;
    }

    if (planId) {
      const planExists = await Plan.findById(planId);
      if (!planExists) {
        return sendResponse(res, 400, false, 'Selected plan does not exist');
      }
      org.planId = planId;
    }

    await org.save();

    const updatedOrg = await Organization.findById(org._id).populate('planId');
    return sendResponse(res, 200, true, 'Organization updated successfully', updatedOrg);
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
    
    // Count AI usage logs in the last 7 days
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const aiUsageCount = await AiAuditLog.countDocuments({ timestamp: { $gte: oneWeekAgo } });

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
      aiUsageCount,
      planDistribution: planStats,
    });
  } catch (error) {
    next(error);
  }
};

export const getPlans = async (req, res, next) => {
  try {
    const list = await Plan.find();
    return sendResponse(res, 200, true, 'All plans retrieved', list);
  } catch (error) {
    next(error);
  }
};

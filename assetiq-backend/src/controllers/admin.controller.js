import { Organization } from '../models/Organization.js';
import { User } from '../models/User.js';
import { Asset } from '../models/Asset.js';
import { Plan } from '../models/Plan.js';
import { Branch } from '../models/Branch.js';
import { Building } from '../models/Building.js';
import { Floor } from '../models/Floor.js';
import { Room } from '../models/Room.js';
import { AiAuditLog } from '../models/AiAuditLog.js';
import { MaintenanceRequest } from '../models/MaintenanceRequest.js';
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

export const createOrgAdmin = async (req, res, next) => {
  try {
    const { organizationId, email, password } = req.body;
    if (!organizationId || !email || !password) {
      return sendResponse(res, 400, false, 'organizationId, email, and password are required');
    }

    const org = await Organization.findById(organizationId);
    if (!org) {
      return sendResponse(res, 404, false, 'Organization not found');
    }

    const orgIdString = org._id.toString();

    const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
    if (existingUser) {
      return sendResponse(res, 400, false, 'A user with this email address already exists');
    }

    let newUser;
    await runWithTenant(orgIdString, async () => {
      newUser = await User.create({
        email: email.trim().toLowerCase(),
        passwordHash: password,
        role: 'org_admin',
        organizationId: orgIdString
      });
    });

    return sendResponse(res, 201, true, `Org Admin user created for ${org.name}`, {
      _id: newUser._id,
      email: newUser.email,
      role: newUser.role,
      organizationId: orgIdString,
      organizationName: org.name
    });
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

export const deleteOrganization = async (req, res, next) => {
  try {
    const { id } = req.params;
    const org = await Organization.findById(id);
    if (!org) {
      return sendResponse(res, 404, false, 'Organization not found');
    }

    // Delete organization document and purge its associated users and assets
    await Promise.all([
      Organization.findByIdAndDelete(id),
      User.deleteMany({ organizationId: id }),
      Asset.deleteMany({ organizationId: id }),
      Branch.deleteMany({ organizationId: id }),
      Building.deleteMany({ organizationId: id }),
      Floor.deleteMany({ organizationId: id }),
      Room.deleteMany({ organizationId: id }),
    ]);

    return sendResponse(res, 200, true, 'Organization and its storage data purged successfully', null);
  } catch (error) {
    next(error);
  }
};

export const inspectOrganization = async (req, res, next) => {
  try {
    const { id } = req.params;
    const org = await Organization.findById(id).populate('planId');
    if (!org) {
      return sendResponse(res, 404, false, 'Organization not found');
    }

    const [branches, buildings, floors, rooms, assets, users] = await Promise.all([
      Branch.find({ organizationId: id }),
      Building.find({ organizationId: id }),
      Floor.find({ organizationId: id }),
      Room.find({ organizationId: id }),
      Asset.find({ organizationId: id })
        .populate('categoryId')
        .populate('roomId')
        .populate('assignedTo'),
      User.find({ organizationId: id }).select('email role createdAt')
    ]);

    return sendResponse(res, 200, true, 'Organization details retrieved successfully', {
      organization: org,
      branches,
      buildings,
      floors,
      rooms,
      assets,
      users
    });
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

export const createPlan = async (req, res, next) => {
  try {
    const { name, slug, price, maxAssets } = req.body;
    if (!name || !slug || maxAssets === undefined) {
      return sendResponse(res, 400, false, 'name, slug, and maxAssets are required');
    }

    const existingPlan = await Plan.findOne({ slug });
    if (existingPlan) {
      return sendResponse(res, 400, false, 'Plan slug must be unique');
    }

    const plan = await Plan.create({ name, slug, price: price || 0, maxAssets });
    return sendResponse(res, 201, true, 'Plan created successfully', plan);
  } catch (error) {
    next(error);
  }
};

export const updatePlan = async (req, res, next) => {
  try {
    const { name, price, maxAssets } = req.body;
    const plan = await Plan.findById(req.params.id);
    if (!plan) {
      return sendResponse(res, 404, false, 'Plan not found');
    }

    if (name) plan.name = name;
    if (price !== undefined) plan.price = price;
    if (maxAssets !== undefined) plan.maxAssets = maxAssets;

    await plan.save();
    return sendResponse(res, 200, true, 'Plan updated successfully', plan);
  } catch (error) {
    next(error);
  }
};

export const deletePlan = async (req, res, next) => {
  try {
    const inUse = await Organization.exists({ planId: req.params.id });
    if (inUse) {
      return sendResponse(res, 400, false, 'Cannot delete plan: it is currently assigned to one or more organizations');
    }

    const plan = await Plan.findByIdAndDelete(req.params.id);
    if (!plan) {
      return sendResponse(res, 404, false, 'Plan not found');
    }
    return sendResponse(res, 200, true, 'Plan deleted successfully', null);
  } catch (error) {
    next(error);
  }
};

export const getStorageUsage = async (req, res, next) => {
  try {
    const orgs = await Organization.find().lean();
    const assets = await Asset.find()
      .populate('categoryId', 'name')
      .populate({
        path: 'roomId',
        select: 'name floorId',
        populate: {
          path: 'floorId',
          select: 'name buildingId',
          populate: { path: 'buildingId', select: 'name' }
        }
      })
      .lean();

    const result = orgs.map((org) => {
      const orgAssets = assets.filter((a) => a.organizationId && a.organizationId.toString() === org._id.toString());
      return {
        organizationId: org._id,
        organizationName: org.name,
        slug: org.slug,
        status: org.status,
        assetCount: orgAssets.length,
        assets: orgAssets.map((a) => {
          const room = a.roomId;
          const floor = room?.floorId;
          const building = floor?.buildingId;
          const locationStr = room 
            ? `${room.name}${floor ? ' - ' + floor.name : ''}${building ? ' (' + building.name + ')' : ''}`
            : 'Unassigned Room';
          return {
            _id: a._id,
            assetCode: a.assetCode,
            name: a.name,
            categoryName: a.categoryId?.name || 'Uncategorized',
            roomLocation: locationStr,
            status: a.status,
            purchasePrice: a.purchasePrice || 0,
          };
        }),
      };
    });

    return sendResponse(res, 200, true, 'Organization storage details retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

export const getAllGlobalTickets = async (req, res, next) => {
  try {
    const list = await MaintenanceRequest.find()
      .populate('organizationId', 'name slug')
      .populate({
        path: 'assetId',
        select: 'name assetCode status organizationId',
        populate: { path: 'organizationId', select: 'name slug' }
      })
      .populate('raisedBy', 'email role')
      .sort({ createdAt: -1 });

    return sendResponse(res, 200, true, 'Global maintenance tickets retrieved', list);
  } catch (error) {
    next(error);
  }
};

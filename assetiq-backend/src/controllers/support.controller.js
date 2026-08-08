import { SupportTicket } from '../models/SupportTicket.js';
import { SupportMessage } from '../models/SupportMessage.js';
import { User } from '../models/User.js';
import { Asset } from '../models/Asset.js';
import { Organization } from '../models/Organization.js';
import { sendResponse } from '../utils/apiResponse.js';

export const getSupportOrganizations = async (req, res, next) => {
  try {
    if (req.user.role !== 'super_admin') {
      return sendResponse(res, 403, false, 'Only Super Admins can list organizations for messaging');
    }
    const orgs = await Organization.find({ status: 'active' }).select('name slug').sort({ name: 1 });
    return sendResponse(res, 200, true, 'Active organizations retrieved', orgs);
  } catch (error) {
    next(error);
  }
};

export const getSupportOrgAdmins = async (req, res, next) => {
  try {
    if (req.user.role !== 'super_admin') {
      return sendResponse(res, 403, false, 'Only Super Admins can query organization admins');
    }
    const { orgId } = req.params;
    const admins = await User.find({ organizationId: orgId, role: 'org_admin' }).select('email role name').sort({ email: 1 });
    return sendResponse(res, 200, true, 'Organization admins retrieved', admins);
  } catch (error) {
    next(error);
  }
};

export const createSupportTicket = async (req, res, next) => {
  try {
    const { subject, initialMessage, assetId, issueType, priority } = req.body;
    let { type, recipientId, organizationId } = req.body;

    if (!subject || !subject.trim()) {
      return sendResponse(res, 400, false, 'subject is required');
    }

    if (!initialMessage || !initialMessage.trim()) {
      return sendResponse(res, 400, false, 'initialMessage is required');
    }

    // A. Super Admin Messaging Flow
    if (req.user.role === 'super_admin') {
      if (!recipientId) {
        return sendResponse(res, 400, false, 'recipientId (Org Admin ID) is required for Super Admin');
      }

      const targetUser = await User.findById(recipientId);
      if (!targetUser) {
        return sendResponse(res, 404, false, 'Target Org Admin not found');
      }

      type = 'platform_support';
      organizationId = targetUser.organizationId || organizationId;
    } else if (type === 'platform_support') {
      // B. Org Admin / User messaging Super Admin
      if (!recipientId) {
        const defaultSuperAdmin = await User.findOne({ role: 'super_admin' });
        if (!defaultSuperAdmin) {
          return sendResponse(res, 500, false, 'No default Platform Super Admin available');
        }
        recipientId = defaultSuperAdmin._id;
      } else {
        const targetUser = await User.findById(recipientId);
        if (!targetUser || targetUser.role !== 'super_admin') {
          return sendResponse(res, 400, false, 'Target recipient for platform_support must be a Super Admin');
        }
      }
      organizationId = req.orgId || req.user.organizationId;
    } else {
      // C. Organization 1:1 messaging within organization
      type = 'internal';
      if (!recipientId) {
        return sendResponse(res, 400, false, 'recipientId is required for organization support tickets');
      }

      if (recipientId.toString() === req.user._id.toString()) {
        return sendResponse(res, 400, false, 'You cannot create a support ticket with yourself');
      }

      const targetUser = await User.findOne({
        _id: recipientId,
        organizationId: req.orgId,
      });

      if (!targetUser) {
        return sendResponse(res, 404, false, 'Recipient user not found in your organization');
      }
      organizationId = req.orgId || req.user.organizationId;
    }

    // Edge Case 2: Employee Asset Ownership Validation
    let linkedAsset = null;
    if (assetId) {
      linkedAsset = await Asset.findById(assetId);
      if (!linkedAsset) {
        return sendResponse(res, 404, false, 'Linked asset not found');
      }

      if (req.user.role === 'employee') {
        const isAssignedToUser = linkedAsset.assignedTo && (
          linkedAsset.assignedTo.toString() === req.user.employeeRef?.toString() ||
          linkedAsset.assignedTo.toString() === req.user._id.toString()
        );

        if (!isAssignedToUser) {
          return sendResponse(res, 403, false, 'You can only raise support tickets for assets assigned to you');
        }
      }
    }

    // Automatic Asset State Transition on Hardware Damage / Lost
    const selectedIssueType = issueType || 'hardware_damage';
    if (linkedAsset && ['hardware_damage', 'lost_stolen'].includes(selectedIssueType)) {
      linkedAsset.status = selectedIssueType === 'lost_stolen' ? 'damaged' : 'under_maintenance';
      await linkedAsset.save();
    }

    // Create SupportTicket
    const ticket = await SupportTicket.create({
      organizationId,
      type: type || 'internal',
      raisedBy: req.user._id,
      recipientId,
      assetId: assetId || null,
      issueType: selectedIssueType,
      priority: priority || 'medium',
      subject: subject.trim(),
      status: 'open',
    });

    // Create initial System Event audit message
    const assetSnippet = linkedAsset ? `for Asset ${linkedAsset.name} (${linkedAsset.assetCode})` : '';
    await SupportMessage.create({
      organizationId: ticket.organizationId,
      ticketId: ticket._id,
      senderId: req.user._id,
      senderName: 'System Audit',
      senderRole: 'system',
      isSystemEvent: true,
      systemEventType: 'TICKET_CREATED',
      message: `📌 System: Support ticket created by ${req.user.email.split('@')[0]} ${assetSnippet} [Priority: ${(priority || 'medium').toUpperCase()} | Issue: ${selectedIssueType.replace('_', ' ').toUpperCase()}]`,
    });

    // Create initial user discussion message
    const message = await SupportMessage.create({
      organizationId: ticket.organizationId,
      ticketId: ticket._id,
      senderId: req.user._id,
      senderName: req.user.email.split('@')[0],
      senderRole: req.user.role,
      message: initialMessage.trim(),
    });

    // Populate created ticket
    const populatedTicket = await SupportTicket.findById(ticket._id)
      .populate('raisedBy', 'email role name')
      .populate('recipientId', 'email role name')
      .populate('organizationId', 'name slug')
      .populate({
        path: 'assetId',
        populate: [{ path: 'categoryId' }, { path: 'roomId' }, { path: 'assignedTo' }],
      });

    return sendResponse(res, 201, true, 'Support ticket created successfully', {
      ticket: populatedTicket,
      message,
    });
  } catch (error) {
    next(error);
  }
};

export const getMySupportTickets = async (req, res, next) => {
  try {
    let filter = {};

    if (req.user.role === 'super_admin') {
      filter = {
        $or: [
          { type: 'platform_support' },
          { raisedBy: req.user._id },
          { recipientId: req.user._id },
        ],
      };
    } else {
      filter = {
        $or: [
          { raisedBy: req.user._id },
          { recipientId: req.user._id },
        ],
      };
    }

    const tickets = await SupportTicket.find(filter)
      .populate('raisedBy', 'email role name')
      .populate('recipientId', 'email role name')
      .populate('organizationId', 'name slug')
      .populate({
        path: 'assetId',
        populate: [{ path: 'categoryId' }, { path: 'roomId' }, { path: 'assignedTo' }],
      })
      .sort({ updatedAt: -1 });

    return sendResponse(res, 200, true, 'Support tickets retrieved', tickets);
  } catch (error) {
    next(error);
  }
};

export const getSupportMessages = async (req, res, next) => {
  try {
    const { ticketId } = req.params;

    const ticket = await SupportTicket.findById(ticketId)
      .populate('raisedBy', 'email role name')
      .populate('recipientId', 'email role name')
      .populate('organizationId', 'name slug')
      .populate({
        path: 'assetId',
        populate: [{ path: 'categoryId' }, { path: 'roomId' }, { path: 'assignedTo' }],
      });

    if (!ticket) {
      return sendResponse(res, 404, false, 'Support ticket not found');
    }

    // Verify participant authorization
    const isRaisedBy = ticket.raisedBy._id.toString() === req.user._id.toString();
    const isRecipient = ticket.recipientId._id.toString() === req.user._id.toString();
    const isSuperAdminPlatform = req.user.role === 'super_admin';

    if (!isRaisedBy && !isRecipient && !isSuperAdminPlatform) {
      return sendResponse(res, 403, false, 'Access denied: You are not a participant in this support ticket');
    }

    const messages = await SupportMessage.find({ ticketId }).sort({ createdAt: 1 });

    return sendResponse(res, 200, true, 'Support messages retrieved', {
      ticket,
      messages,
    });
  } catch (error) {
    next(error);
  }
};

export const updateSupportTicketRepairDetails = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const { vendorName, scheduledDate, estimatedCost } = req.body;

    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
      return sendResponse(res, 404, false, 'Support ticket not found');
    }

    if (vendorName !== undefined) ticket.vendorName = vendorName;
    if (scheduledDate !== undefined) ticket.scheduledDate = scheduledDate;
    if (estimatedCost !== undefined) ticket.estimatedCost = estimatedCost;

    await ticket.save();

    // System audit message
    const formattedDate = scheduledDate ? new Date(scheduledDate).toLocaleDateString() : 'TBD';
    const costStr = estimatedCost ? `$${estimatedCost}` : '$0.00';
    await SupportMessage.create({
      organizationId: ticket.organizationId,
      ticketId: ticket._id,
      senderId: req.user._id,
      senderName: 'System Audit',
      senderRole: 'system',
      isSystemEvent: true,
      systemEventType: 'REPAIR_SCHEDULED',
      message: `🛠️ System: Repair service updated by ${req.user.email.split('@')[0]} (Technician/Vendor: '${ticket.vendorName || 'N/A'}', Date: '${formattedDate}', Est. Cost: ${costStr})`,
    });

    const updatedTicket = await SupportTicket.findById(ticketId)
      .populate('raisedBy', 'email role name')
      .populate('recipientId', 'email role name')
      .populate('organizationId', 'name slug')
      .populate({
        path: 'assetId',
        populate: [{ path: 'categoryId' }, { path: 'roomId' }, { path: 'assignedTo' }],
      });

    return sendResponse(res, 200, true, 'Maintenance repair details updated', updatedTicket);
  } catch (error) {
    next(error);
  }
};

export const updateSupportTicketStatus = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const { status, assetAction } = req.body; // assetAction: 'restore' | 'retire'

    if (!['open', 'in_progress', 'resolved'].includes(status)) {
      return sendResponse(res, 400, false, "status must be 'open', 'in_progress', or 'resolved'");
    }

    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
      return sendResponse(res, 404, false, 'Support ticket not found');
    }

    const isRaisedBy = ticket.raisedBy.toString() === req.user._id.toString();
    const isRecipient = ticket.recipientId.toString() === req.user._id.toString();
    const isSuperAdminPlatform = req.user.role === 'super_admin';

    if (!isRaisedBy && !isRecipient && !isSuperAdminPlatform) {
      return sendResponse(res, 403, false, 'Access denied: You are not authorized to update this support ticket');
    }

    // Edge Case 1: Smart Asset State Restoration on Resolution
    if (status === 'resolved' && ticket.assetId) {
      const asset = await Asset.findById(ticket.assetId);
      if (asset) {
        if (assetAction === 'retire') {
          asset.status = 'retired';
        } else {
          // Restore to 'assigned' if assignedTo is present, else 'available'
          asset.status = asset.assignedTo ? 'assigned' : 'available';
        }
        await asset.save();

        await SupportMessage.create({
          organizationId: ticket.organizationId,
          ticketId: ticket._id,
          senderId: req.user._id,
          senderName: 'System Audit',
          senderRole: 'system',
          isSystemEvent: true,
          systemEventType: 'ASSET_STATUS_UPDATED',
          message: `✅ System: Ticket resolved by ${req.user.email.split('@')[0]}. Linked Asset (${asset.assetCode}) status updated to '${asset.status.toUpperCase()}'`,
        });
      }
    } else {
      await SupportMessage.create({
        organizationId: ticket.organizationId,
        ticketId: ticket._id,
        senderId: req.user._id,
        senderName: 'System Audit',
        senderRole: 'system',
        isSystemEvent: true,
        systemEventType: 'STATUS_CHANGED',
        message: `🔄 System: Ticket status changed to '${status.toUpperCase()}' by ${req.user.email.split('@')[0]}`,
      });
    }

    ticket.status = status;
    await ticket.save();

    const updatedTicket = await SupportTicket.findById(ticketId)
      .populate('raisedBy', 'email role name')
      .populate('recipientId', 'email role name')
      .populate('organizationId', 'name slug')
      .populate({
        path: 'assetId',
        populate: [{ path: 'categoryId' }, { path: 'roomId' }, { path: 'assignedTo' }],
      });

    return sendResponse(res, 200, true, 'Support ticket status updated', updatedTicket);
  } catch (error) {
    next(error);
  }
};

import { Asset } from '../models/Asset.js';
import { MaintenanceRequest } from '../models/MaintenanceRequest.js';
import { Message } from '../models/Message.js';
import { User } from '../models/User.js';

export const globalSearch = async (user, orgId, queryText) => {
  if (!queryText || !queryText.trim()) {
    return { assets: [], tickets: [], messages: [], users: [] };
  }

  const regex = new RegExp(queryText.trim(), 'i');

  // 1. Search Assets
  const assetFilter = { organizationId: orgId, $or: [{ name: regex }, { assetCode: regex }] };
  if (user.role === 'employee') {
    assetFilter.assignedTo = user.employeeRef;
  }
  const assets = await Asset.find(assetFilter).limit(10);

  // 2. Search Maintenance Tickets
  const tickets = await MaintenanceRequest.find({
    organizationId: orgId,
    $or: [{ description: regex }, { priority: regex }, { type: regex }],
  }).populate('assetId').limit(10);

  // 3. Search Messages
  const messageFilter = { organizationId: orgId, message: regex };
  if (user.role === 'employee') {
    messageFilter.isInternalNote = false;
  }
  const messages = await Message.find(messageFilter).limit(10);

  // 4. Search Users (Staff search)
  let users = [];
  if (['super_admin', 'org_admin', 'asset_manager'].includes(user.role)) {
    users = await User.find({ organizationId: orgId, email: regex }).limit(5);
  }

  return {
    assets: assets.map((a) => ({ id: a._id, title: a.name, code: a.assetCode, type: 'asset' })),
    tickets: tickets.map((t) => ({ id: t._id, title: t.description?.slice(0, 50), status: t.status, type: 'ticket' })),
    messages: messages.map((m) => ({ id: m._id, title: m.message?.slice(0, 50), sender: m.senderName, type: 'message' })),
    users: users.map((u) => ({ id: u._id, title: u.email, role: u.role, type: 'user' })),
  };
};

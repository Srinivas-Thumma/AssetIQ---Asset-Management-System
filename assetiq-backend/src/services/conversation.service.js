import { Conversation } from '../models/Conversation.js';
import { ConversationMember } from '../models/ConversationMember.js';
import { Message } from '../models/Message.js';
import { MaintenanceRequest } from '../models/MaintenanceRequest.js';
import { Asset } from '../models/Asset.js';
import { User } from '../models/User.js';
import { appEventBus, DOMAIN_EVENTS } from '../events/AppEventBus.js';

export const getOrCreateMaintenanceConversation = async (requestId, orgId) => {
  let conversation = await Conversation.findOne({
    type: 'maintenance',
    relatedId: requestId,
  });

  if (!conversation) {
    conversation = await Conversation.create({
      organizationId: orgId,
      type: 'maintenance',
      relatedId: requestId,
      name: `Ticket #${requestId}`,
      isPrivate: false,
    });
  }

  return conversation;
};

export const getOrCreateChannelConversation = async (channelName, orgId, description = '') => {
  let conversation = await Conversation.findOne({
    type: 'channel',
    name: channelName,
  });

  if (!conversation) {
    conversation = await Conversation.create({
      organizationId: orgId,
      type: 'channel',
      name: channelName,
      description,
      isPrivate: false,
    });
  }

  return conversation;
};

export const canUserAccessConversation = async (user, conversationId) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) return { authorized: false, reason: 'Conversation not found' };

  // Super admins & Org admins & Asset managers have broad staff access
  if (['super_admin', 'org_admin', 'asset_manager'].includes(user.role)) {
    return { authorized: true, conversation };
  }

  // Employees: check ticket ownership/assignment for maintenance type
  if (conversation.type === 'maintenance') {
    const request = await MaintenanceRequest.findById(conversation.relatedId);
    if (!request) return { authorized: false, reason: 'Maintenance request not found' };

    const asset = await Asset.findById(request.assetId);
    const isAssigned = asset && asset.assignedTo && (
      asset.assignedTo.toString() === user.employeeRef?.toString() ||
      asset.assignedTo.toString() === user._id.toString()
    );
    const isRaisedBy = request.raisedBy.toString() === user._id.toString();

    if (isAssigned || isRaisedBy) {
      return { authorized: true, conversation, request };
    }
    return { authorized: false, reason: 'Forbidden: You can only access chat on your own assigned or raised requests' };
  }

  // For channels / direct messages, check explicit membership
  const member = await ConversationMember.findOne({
    conversationId,
    userId: user._id,
  });

  if (member) return { authorized: true, conversation };

  return { authorized: false, reason: 'Access denied to this conversation' };
};

export const getConversationMessages = async (user, conversationId) => {
  const { authorized, reason, conversation } = await canUserAccessConversation(user, conversationId);
  if (!authorized) {
    const error = new Error(reason);
    error.statusCode = 403;
    throw error;
  }

  const query = { conversationId };

  // Employees can NEVER see internal notes
  if (user.role === 'employee') {
    query.isInternalNote = false;
  }

  const messages = await Message.find(query).sort({ createdAt: 1 });
  return { conversation, messages };
};

export const postMessageToConversation = async ({
  user,
  conversationId,
  messageText,
  isInternalNote = false,
  attachments = [],
}) => {
  const { authorized, reason, conversation } = await canUserAccessConversation(user, conversationId);
  if (!authorized) {
    const error = new Error(reason);
    error.statusCode = 403;
    throw error;
  }

  // Employees cannot post internal notes
  if (isInternalNote && user.role === 'employee') {
    const error = new Error('Employees cannot post internal notes');
    error.statusCode = 403;
    throw error;
  }

  const newMessage = await Message.create({
    organizationId: user.organizationId,
    conversationId,
    senderId: user._id,
    senderName: user.email.split('@')[0],
    senderRole: user.role,
    message: messageText.trim(),
    isInternalNote: !!isInternalNote,
    attachments: attachments || [],
  });

  // Emit domain event for async subscribers (Notifications, Audit, Sockets)
  appEventBus.emit(DOMAIN_EVENTS.MESSAGE_POSTED, {
    message: newMessage,
    conversation,
    senderUser: user,
  });

  return { conversation, message: newMessage };
};

export const updateLastRead = async (conversationId, userId, orgId) => {
  await ConversationMember.findOneAndUpdate(
    { conversationId, userId },
    { organizationId: orgId, conversationId, userId, lastReadAt: new Date() },
    { upsert: true, new: true }
  );
};

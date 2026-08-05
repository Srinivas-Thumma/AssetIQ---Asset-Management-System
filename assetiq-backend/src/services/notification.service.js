import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { MaintenanceRequest } from '../models/MaintenanceRequest.js';
import { appEventBus, DOMAIN_EVENTS } from '../events/AppEventBus.js';

/**
 * Shared Chat Notification Dispatcher:
 * Dispatches notifications and WebSocket events for message posts.
 * Filters internal note notifications so employees are never notified.
 */
export const dispatchChatNotifications = async ({
  requestId,
  request,
  senderUser,
  messageText,
  isInternalNote = false,
  io = null,
}) => {
  try {
    const senderEmailPrefix = senderUser.email.split('@')[0];
    const preview = messageText.length > 45
      ? `${messageText.slice(0, 45)}...`
      : messageText;

    const notifPrefix = isInternalNote ? '🔒 Internal Note' : '💬 Ticket message';
    const notifText = `${notifPrefix} from ${senderEmailPrefix}: "${preview}"`;

    const recipientMap = new Map();

    // Staff recipients: org_admin and asset_manager
    const orgStaff = await User.find({
      organizationId: request.organizationId,
      role: { $in: ['org_admin', 'asset_manager'] },
    });

    orgStaff.forEach((u) => {
      if (u._id.toString() !== senderUser._id.toString()) {
        recipientMap.set(u._id.toString(), u);
      }
    });

    // Public messages also notify ticket raiser (employee), internal notes DO NOT notify employee
    if (!isInternalNote && request.raisedBy && request.raisedBy.toString() !== senderUser._id.toString()) {
      const raisedUser = await User.findById(request.raisedBy);
      if (raisedUser && raisedUser.role === 'employee') {
        recipientMap.set(raisedUser._id.toString(), raisedUser);
      }
    }

    const recipients = Array.from(recipientMap.values());

    for (const recipient of recipients) {
      if (recipient._id.toString() === senderUser._id.toString()) continue;

      const notifDoc = await Notification.create({
        organizationId: request.organizationId,
        userId: recipient._id,
        message: notifText,
        type: 'chat_message',
        relatedId: requestId,
        read: false,
      });

      if (io) {
        io.to(`user:${recipient._id.toString()}`).emit('notification:new', notifDoc);
      }
    }
  } catch (err) {
    console.error('⚠️ notification.service: dispatchChatNotifications failed:', err.message);
  }
};

// EventBus Subscriber: Listens for MESSAGE_POSTED domain events
appEventBus.on(DOMAIN_EVENTS.MESSAGE_POSTED, async ({ message, conversation, senderUser }) => {
  try {
    if (conversation.type === 'maintenance' && conversation.relatedId) {
      const request = await MaintenanceRequest.findById(conversation.relatedId);
      if (request) {
        let io = null;
        try {
          const { getIO } = await import('../config/socket.js');
          io = getIO();
        } catch (_) {}

        await dispatchChatNotifications({
          requestId: request._id,
          request,
          senderUser,
          messageText: message.message,
          isInternalNote: message.isInternalNote,
          io,
        });
      }
    }
  } catch (err) {
    console.error('⚠️ EventBus MESSAGE_POSTED listener error:', err.message);
  }
});

import { Server } from 'socket.io';
import cookie from 'cookie';
import { verifyTokenAndGetUser } from '../middlewares/auth.middleware.js';
import { MaintenanceRequest } from '../models/MaintenanceRequest.js';
import { MaintenanceMessage } from '../models/MaintenanceMessage.js';
import { Asset } from '../models/Asset.js';
import { SupportTicket } from '../models/SupportTicket.js';
import { SupportMessage } from '../models/SupportMessage.js';
import { Notification } from '../models/Notification.js';
import { dispatchChatNotifications } from '../services/notification.service.js';
import {
  canUserAccessConversation,
  postMessageToConversation,
  updateLastRead,
} from '../services/conversation.service.js';

/**
 * Socket.IO Instance Reference
 * Global singleton reference to the running Socket.IO server instance.
 */
let io = null;

/**
 * Maintenance Chat Access Permission Guard:
 * Verifies if an authenticated socket user has authorization to enter or post messages
 * in a maintenance request chat room.
 *
 * Rules:
 * - Super Admins & Org Admins & Asset Managers: Full org-level access.
 * - Employees: Access restricted to requests they created or assets assigned to them.
 */
const checkChatAccessPermission = async (socket, requestId) => {
  if (!requestId) {
    return { authorized: false, reason: 'Request ID is required' };
  }

  let request = null;
  if (socket.user.role === 'super_admin' && !socket.orgId) {
    request = await MaintenanceRequest.findById(requestId);
  } else {
    request = await MaintenanceRequest.findOne({ _id: requestId, organizationId: socket.orgId });
  }

  if (!request) {
    return { authorized: false, reason: 'Maintenance request not found or cross-tenant access denied' };
  }

  if (['super_admin', 'org_admin', 'asset_manager'].includes(socket.user.role)) {
    return { authorized: true, request };
  }

  if (socket.user.role === 'employee') {
    const asset = await Asset.findById(request.assetId);
    const isAssigned = asset && asset.assignedTo && (
      asset.assignedTo.toString() === socket.user.employeeRef?.toString() ||
      asset.assignedTo.toString() === socket.user._id.toString()
    );
    const isRaisedBy = request.raisedBy.toString() === socket.user._id.toString();

    if (isAssigned || isRaisedBy) {
      return { authorized: true, request };
    }
    return { authorized: false, reason: 'Forbidden: Employees can only access chat for their assigned or raised requests' };
  }

  return { authorized: false, reason: 'Forbidden: Insufficient privileges' };
};

/**
 * Support Ticket Access Permission Guard:
 * Verifies if an authenticated socket user has authorization to enter or post messages
 * in a 1:1 support ticket room.
 *
 * Rules:
 * - Raised By user OR Recipient user: Authorized.
 * - Super Admin (for platform_support type): Authorized unscoped across orgs.
 */
const checkSupportTicketAccessPermission = async (socket, ticketId) => {
  if (!ticketId) {
    return { authorized: false, reason: 'Ticket ID is required' };
  }

  let ticket = null;
  if (socket.user.role === 'super_admin') {
    ticket = await SupportTicket.findById(ticketId);
  } else {
    ticket = await SupportTicket.findById(ticketId);
  }

  if (!ticket) {
    return { authorized: false, reason: 'Support ticket not found or cross-tenant access denied' };
  }

  const isRaisedBy = ticket.raisedBy.toString() === socket.user._id.toString();
  const isRecipient = ticket.recipientId.toString() === socket.user._id.toString();
  const isSuperAdminPlatform = socket.user.role === 'super_admin' && ticket.type === 'platform_support';

  if (isRaisedBy || isRecipient || isSuperAdminPlatform) {
    return { authorized: true, ticket };
  }

  return { authorized: false, reason: 'Access denied: You are not a participant in this support ticket' };
};

/**
 * Initialize Socket.IO Server:
 * Mounts Socket.IO server onto the HTTP server instance, sets up authentication handshake middleware,
 * user/org room subscriptions, and real-time event listeners.
 */
export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
    },
  });

  // Handshake Authentication Middleware: Validates JWT token from cookies or auth headers
  io.use(async (socket, next) => {
    try {
      const rawCookieHeader = socket.handshake.headers?.cookie || '';
      const parsedCookies = cookie.parse(rawCookieHeader);
      const token = parsedCookies.accessToken || socket.handshake.auth?.token;

      if (!token) {
        return next(new Error('Authentication failed: No token provided'));
      }

      const user = await verifyTokenAndGetUser(token);
      socket.user = user;
      socket.orgId = user.organizationId ? user.organizationId.toString() : null;

      next();
    } catch (err) {
      console.error(`❌ Socket Auth Rejected (${socket.id}):`, err.message);
      next(new Error(`Authentication failed: ${err.message}`));
    }
  });

  // Socket Connection Event Lifecycle
  io.on('connection', (socket) => {
    const userIdStr = socket.user._id.toString();

    // Auto-join private user room (`user:<userId>`) and tenant org room (`org:<orgId>`)
    socket.join(`user:${userIdStr}`);
    if (socket.orgId) {
      socket.join(`org:${socket.orgId}`);
    }

    console.log(`🔌 Socket ${socket.id} connected for User [${socket.user.email}] (${socket.user.role}). Joined rooms:`, Array.from(socket.rooms));

    /**
     * Unified Polymorphic Conversation Socket Handlers:
     * Handles joining rooms, live messaging, typing indicators, and read receipts across all conversation types.
     */
    socket.on('conversation:join', async ({ conversationId }) => {
      try {
        const { authorized, reason } = await canUserAccessConversation(socket.user, conversationId);
        if (!authorized) {
          socket.emit('conversation:error', { conversationId, message: reason });
          return;
        }

        const roomName = `conversation:${conversationId}`;
        socket.join(roomName);
        socket.emit('conversation:joined', { conversationId, room: roomName });
      } catch (err) {
        socket.emit('conversation:error', { conversationId, message: err.message });
      }
    });

    socket.on('conversation:message', async ({ conversationId, message, isInternalNote, attachments }) => {
      try {
        const result = await postMessageToConversation({
          user: socket.user,
          conversationId,
          messageText: message,
          isInternalNote,
          attachments,
        });

        const roomName = `conversation:${conversationId}`;
        io.to(roomName).emit('conversation:message', result.message);

        if (socket.orgId) {
          io.to(`org:${socket.orgId}`).emit('conversation:new_message', {
            conversationId,
            senderEmail: socket.user.email,
          });
        }
      } catch (err) {
        socket.emit('conversation:error', { conversationId, message: err.message });
      }
    });

    socket.on('conversation:typing', ({ conversationId, isTyping }) => {
      const roomName = `conversation:${conversationId}`;
      socket.to(roomName).emit('conversation:user_typing', {
        conversationId,
        userEmail: socket.user.email,
        isTyping,
      });
    });

    socket.on('conversation:read', async ({ conversationId }) => {
      try {
        await updateLastRead(conversationId, socket.user._id, socket.orgId);
        socket.emit('conversation:read_ack', { conversationId });
      } catch (err) {
        console.error('Failed to update read timestamp:', err.message);
      }
    });

    /**
     * Support Ticket 1:1 Real-time Messaging Handlers:
     * Manages 1:1 platform support and internal messaging rooms with auto-reopening for resolved tickets.
     */
    socket.on('support:join', async ({ ticketId }) => {
      try {
        const { authorized, reason } = await checkSupportTicketAccessPermission(socket, ticketId);
        if (!authorized) {
          console.warn(`🛑 Support Join Denied for Socket ${socket.id} (${socket.user.email}) on Ticket [${ticketId}]: ${reason}`);
          socket.emit('support:error', { ticketId, message: reason });
          return;
        }

        const roomName = `support:ticket:${ticketId}`;
        socket.join(roomName);
        console.log(`💬 Socket ${socket.id} (${socket.user.email}) joined support ticket room [${roomName}]`);
        socket.emit('support:joined', { ticketId, room: roomName });
      } catch (err) {
        console.error('❌ Support Join Error:', err.message);
        socket.emit('support:error', { ticketId, message: 'Server error during support ticket join' });
      }
    });

    socket.on('support:typing', ({ ticketId, isTyping }) => {
      const roomName = `support:ticket:${ticketId}`;
      socket.to(roomName).emit('support:user_typing', {
        ticketId,
        userEmail: socket.user.email,
        isTyping,
      });
    });

    socket.on('support:message', async ({ ticketId, message }) => {
      try {
        if (!message || !message.trim()) {
          socket.emit('support:error', { ticketId, message: 'Message content cannot be empty' });
          return;
        }

        const { authorized, reason, ticket } = await checkSupportTicketAccessPermission(socket, ticketId);
        if (!authorized) {
          console.warn(`🛑 Support Message Blocked for Socket ${socket.id} (${socket.user.email}) on Ticket [${ticketId}]: ${reason}`);
          socket.emit('support:error', { ticketId, message: reason });
          return;
        }

        // Auto-reopen resolved ticket if a new message arrives during active conversation
        if (ticket.status === 'resolved') {
          ticket.status = 'in_progress';
          await ticket.save();
        }

        const newMessage = await SupportMessage.create({
          organizationId: ticket.organizationId,
          ticketId,
          senderId: socket.user._id,
          senderName: socket.user.email.split('@')[0],
          senderRole: socket.user.role,
          message: message.trim(),
        });

        const roomName = `support:ticket:${ticketId}`;
        io.to(roomName).emit('support:message', newMessage);

        // Dispatch live in-app notification to the other participant's private user room
        const otherUserId = ticket.raisedBy.toString() === socket.user._id.toString()
          ? ticket.recipientId
          : ticket.raisedBy;

        const senderPrefix = socket.user.email.split('@')[0];
        const preview = message.trim().length > 45 ? `${message.trim().slice(0, 45)}...` : message.trim();

        try {
          const notifDoc = await Notification.create({
            organizationId: ticket.organizationId,
            userId: otherUserId,
            message: `💬 New support message from ${senderPrefix}: "${preview}"`,
            type: 'chat_message',
            relatedId: ticketId,
            read: false,
          });

          io.to(`user:${otherUserId.toString()}`).emit('notification:new', notifDoc);
        } catch (notifErr) {
          console.error('⚠️ Support notification generation issue:', notifErr.message);
        }
      } catch (err) {
        console.error('❌ Support Message Error:', err.message);
        socket.emit('support:error', { ticketId, message: 'Failed to send support message' });
      }
    });

    /**
     * Legacy Maintenance Chat Handlers:
     * Maintained for backward compatibility with older maintenance chat client events.
     */
    socket.on('chat:join', async ({ requestId }) => {
      try {
        const { authorized, reason } = await checkChatAccessPermission(socket, requestId);
        if (!authorized) {
          socket.emit('chat:error', { requestId, message: reason });
          return;
        }

        const roomName = `chat:request:${requestId}`;
        socket.join(roomName);
        socket.emit('chat:joined', { requestId, room: roomName });
      } catch (err) {
        socket.emit('chat:error', { requestId, message: 'Server error during chat join' });
      }
    });

    socket.on('chat:message', async ({ requestId, message }) => {
      try {
        if (!message || !message.trim()) {
          socket.emit('chat:error', { requestId, message: 'Message content cannot be empty' });
          return;
        }

        const { authorized, reason, request } = await checkChatAccessPermission(socket, requestId);
        if (!authorized) {
          socket.emit('chat:error', { requestId, message: reason });
          return;
        }

        const newMessage = await MaintenanceMessage.create({
          organizationId: request.organizationId,
          requestId,
          senderId: socket.user._id,
          senderName: socket.user.email.split('@')[0],
          senderRole: socket.user.role,
          message: message.trim(),
        });

        const roomName = `chat:request:${requestId}`;
        io.to(roomName).emit('chat:message', newMessage);

        if (socket.orgId) {
          io.to(`org:${socket.orgId}`).emit('chat:new_message', {
            requestId,
            senderEmail: socket.user.email,
          });
        }

        await dispatchChatNotifications({
          requestId,
          request,
          senderUser: socket.user,
          messageText: message.trim(),
          io,
        });
      } catch (err) {
        console.error('❌ Chat Message Error:', err.message);
        socket.emit('chat:error', { requestId, message: 'Failed to send chat message' });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Socket ${socket.id} disconnected (${reason})`);
    });
  });

  return io;
};

/**
 * Get Socket.IO Instance:
 * Exposes running io instance for service invocations outside the socket connection loop.
 */
export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io has not been initialized yet!');
  }
  return io;
};

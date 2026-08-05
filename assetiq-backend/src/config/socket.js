import { Server } from 'socket.io';
import cookie from 'cookie';
import { verifyTokenAndGetUser } from '../middlewares/auth.middleware.js';
import { MaintenanceRequest } from '../models/MaintenanceRequest.js';
import { MaintenanceMessage } from '../models/MaintenanceMessage.js';
import { Asset } from '../models/Asset.js';
import { dispatchChatNotifications } from '../services/notification.service.js';
import {
  canUserAccessConversation,
  postMessageToConversation,
  updateLastRead,
} from '../services/conversation.service.js';

let io = null;

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

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
    },
  });

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

  io.on('connection', (socket) => {
    const userIdStr = socket.user._id.toString();

    socket.join(`user:${userIdStr}`);
    if (socket.orgId) {
      socket.join(`org:${socket.orgId}`);
    }

    console.log(`🔌 Socket ${socket.id} connected for User [${socket.user.email}] (${socket.user.role}). Joined rooms:`, Array.from(socket.rooms));

    // Unified Conversation Socket Handlers
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

    // Legacy Maintenance Chat Room Handlers (Backward Compatibility)
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
        socket.emit('chat:error', { requestId, message: 'Failed to send chat message' });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Socket ${socket.id} disconnected (${reason})`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io has not been initialized yet!');
  }
  return io;
};

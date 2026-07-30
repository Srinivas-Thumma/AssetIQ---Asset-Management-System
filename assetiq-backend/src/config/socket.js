import { Server } from 'socket.io';
import cookie from 'cookie';
import { verifyTokenAndGetUser } from '../middlewares/auth.middleware.js';
import { MaintenanceRequest } from '../models/MaintenanceRequest.js';
import { MaintenanceMessage } from '../models/MaintenanceMessage.js';
import { Asset } from '../models/Asset.js';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';

/**
 * Socket.IO Real-Time Engine & Room Isolation Infrastructure:
 * Manages WebSocket connections for live maintenance chat and real-time push notifications.
 * 
 * Room Architecture & Isolation Strategy:
 * 1. User Private Room (`user:<userId>`): Receives direct personal notifications (e.g. ticket assignments, chat mentions).
 * 2. Organization Room (`org:<orgId>`): Receives tenant-wide announcements.
 * 3. Chat Room (`chat:request:<requestId>`): Isolated channel for ticket maintenance messaging with strict RBAC permission guards.
 */

let io = null;

const checkChatAccessPermission = async (socket, requestId) => {
  if (!requestId) {
    return { authorized: false, reason: 'Request ID is required' };
  }

  // 1. Fetch Maintenance Request within socket's organization tenant scope
  let request = null;

  if (socket.user.role === 'super_admin' && !socket.orgId) {
    request = await MaintenanceRequest.findById(requestId);
  } else {
    request = await MaintenanceRequest.findOne({ _id: requestId, organizationId: socket.orgId });
  }

  if (!request) {
    return { authorized: false, reason: 'Maintenance request not found or cross-tenant access denied' };
  }

  // 2. Admin & Asset Manager role permissions (org_admin, super_admin, asset_manager)
  if (['super_admin', 'org_admin', 'asset_manager'].includes(socket.user.role)) {
    return { authorized: true, request };
  }

  // 3. Employee role permissions
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

  // 1. Socket Authentication Middleware (Handshake Verification)
  io.use(async (socket, next) => {
    try {
      // Socket.IO handshake occurs outside Express middleware chain.
      // We parse raw HTTP cookies manually using the lower-level 'cookie' package.
      const rawCookieHeader = socket.handshake.headers?.cookie || '';
      const parsedCookies = cookie.parse(rawCookieHeader);
      
      // Support cookie-based token (preferred) or handshake.auth token fallback
      const token = parsedCookies.accessToken || socket.handshake.auth?.token;

      if (!token) {
        return next(new Error('Authentication failed: No token provided'));
      }

      // Reuse exact same JWT verification and user active check as HTTP protect middleware
      const user = await verifyTokenAndGetUser(token);

      // Attach verified user context to socket instance
      socket.user = user;
      socket.orgId = user.organizationId ? user.organizationId.toString() : null;

      next();
    } catch (err) {
      console.error(`❌ Socket Auth Rejected (${socket.id}):`, err.message);
      next(new Error(`Authentication failed: ${err.message}`));
    }
  });

  // 2. Socket Connection Lifecycle
  io.on('connection', (socket) => {
    const userIdStr = socket.user._id.toString();
    
    // Auto-join rooms derived ONLY from authenticated socket.user (never from client params)
    socket.join(`user:${userIdStr}`);
    if (socket.orgId) {
      socket.join(`org:${socket.orgId}`);
    }

    console.log(`🔌 Socket ${socket.id} connected for User [${socket.user.email}] (${socket.user.role}). Joined rooms:`, Array.from(socket.rooms));

    // Handle chat room join requests with permission checks
    socket.on('chat:join', async ({ requestId }) => {
      try {
        const { authorized, reason } = await checkChatAccessPermission(socket, requestId);
        if (!authorized) {
          console.warn(`🛑 Chat Join Denied for Socket ${socket.id} (${socket.user.email}) on Request [${requestId}]: ${reason}`);
          socket.emit('chat:error', { requestId, message: reason });
          return;
        }

        const roomName = `chat:request:${requestId}`;
        socket.join(roomName);
        console.log(`💬 Socket ${socket.id} (${socket.user.email}) joined chat room [${roomName}]`);
        socket.emit('chat:joined', { requestId, room: roomName });
      } catch (err) {
        console.error('❌ Chat Join Error:', err.message);
        socket.emit('chat:error', { requestId, message: 'Server error during chat join' });
      }
    });

    // Handle incoming chat messages with strict re-validation
    socket.on('chat:message', async ({ requestId, message }) => {
      try {
        if (!message || !message.trim()) {
          socket.emit('chat:error', { requestId, message: 'Message content cannot be empty' });
          return;
        }

        // ALWAYS re-verify authorization on every message event (never trust previous socket state)
        const { authorized, reason, request } = await checkChatAccessPermission(socket, requestId);
        if (!authorized) {
          console.warn(`🛑 Chat Message Blocked for Socket ${socket.id} (${socket.user.email}) on Request [${requestId}]: ${reason}`);
          socket.emit('chat:error', { requestId, message: reason });
          return;
        }

        // Persist message to database under tenant scope
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
        console.log(`💬 Chat message broadcasted to [${roomName}] by ${socket.user.email}`);

        // Generate and broadcast live Notification to the recipient(s)
        try {
          const senderEmailPrefix = socket.user.email.split('@')[0];
          const notifText = `💬 New ticket message from ${senderEmailPrefix}: "${message.trim().slice(0, 45)}${message.trim().length > 45 ? '...' : ''}"`;

          // Collect all potential recipient users for this organization (Org Admins & Asset Managers)
          const orgStaff = await User.find({
            organizationId: request.organizationId,
            role: { $in: ['org_admin', 'asset_manager'] }
          });

          const recipientMap = new Map();
          orgStaff.forEach((u) => {
            if (u._id.toString() !== socket.user._id.toString()) {
              recipientMap.set(u._id.toString(), u);
            }
          });

          // Also include ticket creator employee if not the message sender
          if (request.raisedBy && request.raisedBy.toString() !== socket.user._id.toString()) {
            const raisedUser = await User.findById(request.raisedBy);
            if (raisedUser) {
              recipientMap.set(raisedUser._id.toString(), raisedUser);
            }
          }

          const recipients = Array.from(recipientMap.values());

          for (const recipient of recipients) {
            if (recipient._id.toString() !== socket.user._id.toString()) {
              const notifDoc = await Notification.create({
                organizationId: request.organizationId,
                userId: recipient._id,
                message: notifText,
                type: 'chat_message',
                relatedId: requestId,
                read: false,
              });

              io.to(`user:${recipient._id.toString()}`).emit('notification:new', notifDoc);
              console.log(`🔔 Live Chat Notification sent to User [${recipient.email}]`);
            }
          }
        } catch (notifErr) {
          console.error('⚠️ Notification generation issue:', notifErr.message);
        }
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

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io has not been initialized yet!');
  }
  return io;
};

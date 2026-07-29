import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { tenantScope } from '../middlewares/tenant.middleware.js';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  markChatNotificationsAsRead
} from '../controllers/notification.controller.js';

const router = express.Router();

// Apply auth and tenant scoping globally to notifications
router.use(protect);
router.use(tenantScope);

router.route('/')
  .get(getNotifications)
  .put(markAllNotificationsAsRead);

router.put('/chat/:requestId', markChatNotificationsAsRead);

router.route('/:id')
  .put(markNotificationAsRead);

export default router;

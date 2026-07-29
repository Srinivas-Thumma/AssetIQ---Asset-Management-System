import { Notification } from '../models/Notification.js';
import { sendResponse } from '../utils/apiResponse.js';

export const getNotifications = async (req, res, next) => {
  try {
    // Only return notifications belonging to the logged in user
    // (Note: tenantScopePlugin will automatically enforce req.orgId checks)
    const list = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 });
    return sendResponse(res, 200, true, 'Notifications retrieved successfully', list);
  } catch (error) {
    next(error);
  }
};

export const markNotificationAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true },
      { new: true }
    );
    if (!notification) {
      return sendResponse(res, 404, false, 'Notification not found');
    }
    return sendResponse(res, 200, true, 'Notification marked as read', notification);
  } catch (error) {
    next(error);
  }
};

export const markAllNotificationsAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, read: false },
      { read: true }
    );
    return sendResponse(res, 200, true, 'All notifications marked as read', null);
  } catch (error) {
    next(error);
  }
};

export const markChatNotificationsAsRead = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    await Notification.updateMany(
      { userId: req.user._id, relatedId: requestId, read: false },
      { read: true }
    );
    return sendResponse(res, 200, true, 'Chat notifications marked as read', null);
  } catch (error) {
    next(error);
  }
};

import {
  getOrCreateMaintenanceConversation,
  getOrCreateChannelConversation,
  getConversationMessages,
  postMessageToConversation,
  updateLastRead,
} from '../services/conversation.service.js';
import { sendResponse } from '../utils/apiResponse.js';

export const getMaintenanceMessagesByRequestId = async (req, res, next) => {
  try {
    const { id } = req.params;
    const conversation = await getOrCreateMaintenanceConversation(id, req.orgId);
    const result = await getConversationMessages(req.user, conversation._id);
    return sendResponse(res, 200, true, 'Messages retrieved', result.messages);
  } catch (error) {
    next(error);
  }
};

export const createMaintenanceMessageByRequestId = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { message, isInternalNote, attachments } = req.body;

    if (!message || !message.trim()) {
      return sendResponse(res, 400, false, 'Message content is required');
    }

    const conversation = await getOrCreateMaintenanceConversation(id, req.orgId);
    const result = await postMessageToConversation({
      user: req.user,
      conversationId: conversation._id,
      messageText: message,
      isInternalNote: !!isInternalNote,
      attachments,
    });

    return sendResponse(res, 201, true, 'Message created successfully', result.message);
  } catch (error) {
    next(error);
  }
};

export const getMessagesByConversationId = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const result = await getConversationMessages(req.user, conversationId);
    return sendResponse(res, 200, true, 'Conversation messages retrieved', result.messages);
  } catch (error) {
    next(error);
  }
};

export const postMessageByConversationId = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { message, isInternalNote, attachments } = req.body;

    if (!message || !message.trim()) {
      return sendResponse(res, 400, false, 'Message content is required');
    }

    const result = await postMessageToConversation({
      user: req.user,
      conversationId,
      messageText: message,
      isInternalNote: !!isInternalNote,
      attachments,
    });

    return sendResponse(res, 201, true, 'Message created', result.message);
  } catch (error) {
    next(error);
  }
};

export const markConversationRead = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    await updateLastRead(conversationId, req.user._id, req.orgId);
    return sendResponse(res, 200, true, 'Conversation marked as read');
  } catch (error) {
    next(error);
  }
};

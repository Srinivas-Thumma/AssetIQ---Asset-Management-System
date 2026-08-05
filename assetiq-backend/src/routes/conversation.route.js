import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { tenantScope } from '../middlewares/tenant.middleware.js';
import {
  getMessagesByConversationId,
  postMessageByConversationId,
  markConversationRead,
} from '../controllers/conversation.controller.js';

const router = express.Router();

router.use(protect);
router.use(tenantScope);

router.route('/:conversationId/messages')
  .get(getMessagesByConversationId)
  .post(postMessageByConversationId);

router.post('/:conversationId/read', markConversationRead);

export default router;

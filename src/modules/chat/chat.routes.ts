import multer from 'multer';
import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validation.middleware';
import * as chatController from './chat.controller';
import {
  conversationParamsSchema,
  createConversationSchema,
  createDirectConversationSchema,
  createGroupConversationSchema,
  messageIdParamSchema,
  messagePaginationQuerySchema,
  reactionEmojiBodySchema,
  reactionEmojiQuerySchema,
  uploadMessageFormSchema
} from './chat.schemas';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024
  }
});

const router = Router();

router.use(authenticate);
router.post(
  '/messages/:messageId/reactions',
  validate({ params: messageIdParamSchema, body: reactionEmojiBodySchema }),
  chatController.addReaction
);
router.delete(
  '/messages/:messageId/reactions',
  validate({ params: messageIdParamSchema, query: reactionEmojiQuerySchema }),
  chatController.removeReaction
);
router.get('/conversations', chatController.getConversations);
router.get(
  '/conversations/:id/messages',
  validate({ params: conversationParamsSchema, query: messagePaginationQuerySchema }),
  chatController.getMessages
);
router.post(
  '/conversations/:id/messages/upload',
  validate({ params: conversationParamsSchema }),
  upload.single('file'),
  validate({ body: uploadMessageFormSchema }),
  chatController.uploadConversationMessage
);
router.delete(
  '/conversations/:id',
  validate({ params: conversationParamsSchema }),
  chatController.deleteConversation
);
router.post(
  '/conversations',
  validate({ body: createConversationSchema }),
  chatController.createConversation
);
router.post(
  '/conversations/direct',
  validate({ body: createDirectConversationSchema }),
  chatController.createDirectConversation
);
router.post(
  '/conversations/group',
  validate({ body: createGroupConversationSchema }),
  chatController.createGroupConversation
);
/** Alias: same body and handler as POST /api/conversations/group */
router.post('/groups', validate({ body: createGroupConversationSchema }), chatController.createGroupConversation);
router.post('/upload', upload.single('file'), chatController.uploadFile);

export default router;

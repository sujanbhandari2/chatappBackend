import path from 'node:path';
import fs from 'node:fs';
import multer from 'multer';
import { Router } from 'express';
import { env } from '../../config/env';
import { authenticate } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validation.middleware';
import * as chatController from './chat.controller';
import {
  conversationParamsSchema,
  createConversationSchema,
  messagePaginationQuerySchema
} from './chat.schemas';

const uploadDirectory = path.resolve(process.cwd(), env.UPLOAD_DIR);
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDirectory),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024
  }
});

const router = Router();

router.use(authenticate);
router.get('/conversations', chatController.getConversations);
router.get(
  '/conversations/:id/messages',
  validate({ params: conversationParamsSchema, query: messagePaginationQuerySchema }),
  chatController.getMessages
);
router.post(
  '/conversations',
  validate({ body: createConversationSchema }),
  chatController.createConversation
);
router.post('/upload', upload.single('file'), chatController.uploadFile);

export default router;

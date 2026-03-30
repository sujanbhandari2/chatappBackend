import multer from 'multer';
import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validation.middleware';
import * as speechController from './speech.controller';
import { translateBodySchema } from './speech.schemas';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024
  }
});

const router = Router();

router.use(authenticate);
router.post('/transcribe', upload.single('audio'), speechController.transcribe);
router.post('/translate', validate({ body: translateBodySchema }), speechController.translate);

export default router;

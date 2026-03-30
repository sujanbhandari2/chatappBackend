import { Router } from 'express';
import * as authController from './auth.controller';
import { validate } from '../../middlewares/validation.middleware';
import { loginSchema, registerSchema } from './auth.schemas';

const router = Router();

router.post('/create', validate({ body: registerSchema }), authController.create);

export default router;

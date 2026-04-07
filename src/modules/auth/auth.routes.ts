import { NextFunction, Request, Response, Router } from 'express';
import * as authController from './auth.controller';
import { validate } from '../../middlewares/validation.middleware';
import { ApiError } from '../../utils/api-error';
import { loginSchema, registerSchema } from './auth.schemas';

const router = Router();

router.post('/create', validate({ body: registerSchema }), authController.create);
router.post('/register', validate({ body: registerSchema }), authController.create);
router.post('/login', validate({ body: loginSchema }), authController.login);

router.use((_req: Request, _res: Response, next: NextFunction) => {
  next(new ApiError(404, 'Route not found'));
});

export default router;

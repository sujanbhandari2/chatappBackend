import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import * as usersController from './users.controller';

const router = Router();

router.use(authenticate);
router.get('/', usersController.listUsers);

export default router;

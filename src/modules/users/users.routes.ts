import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import * as usersController from './users.controller';

const router = Router();

router.use(authenticate);
/** GET /api/users — list users in the authenticated user's tenant only */
router.get('/', usersController.listUsers);

export default router;

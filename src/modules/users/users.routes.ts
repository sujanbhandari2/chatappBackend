import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validation.middleware';
import * as usersController from './users.controller';
import { registerPushTokenSchema, testPushSchema, unregisterPushTokenSchema } from './users.schemas';

const router = Router();

router.use(authenticate);
router.get('/', usersController.listUsers);
router.post('/push-token', validate({ body: registerPushTokenSchema }), usersController.registerPushToken);
router.delete('/push-token', validate({ body: unregisterPushTokenSchema }), usersController.unregisterPushToken);
router.post('/push-token/test', validate({ body: testPushSchema }), usersController.testPush);

export default router;

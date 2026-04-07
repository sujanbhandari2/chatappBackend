import express, { NextFunction, Request, Response } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import chatRoutes from '../modules/chat/chat.routes';
import usersRoutes from '../modules/users/users.routes';
import tenantsRoutes from '../modules/tenants/tenants.routes';
import speechRoutes from '../modules/speech/speech.routes';
import { ApiError } from '../utils/api-error';

/** Avoid falling through to /api chat stack (which requires auth) for bare GET /api */
const rejectBareApiPath = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.path === '/' || req.path === '') {
    next(new ApiError(404, 'Route not found'));
    return;
  }
  next();
};

const registerSystemRoutes = (app: express.Express): void => {
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });
};

const registerApiRoutes = (app: express.Express): void => {
  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/tenants', tenantsRoutes);
  app.use('/api/speech', speechRoutes);
  app.use('/api', rejectBareApiPath);
  app.use('/api', chatRoutes);
};

export const registerRoutes = (app: express.Express): void => {
  registerSystemRoutes(app);
  registerApiRoutes(app);
};

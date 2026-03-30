import express from 'express';
import authRoutes from '../modules/auth/auth.routes';
import chatRoutes from '../modules/chat/chat.routes';
import usersRoutes from '../modules/users/users.routes';
import tenantsRoutes from '../modules/tenants/tenants.routes';
import speechRoutes from '../modules/speech/speech.routes';

const registerSystemRoutes = (app: express.Express): void => {
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });
};

const registerApiRoutes = (app: express.Express): void => {
  app.use('/api/auth', authRoutes);
  app.use('/api', chatRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/tenants', tenantsRoutes);
  app.use('/api/speech', speechRoutes);
};

export const registerRoutes = (app: express.Express): void => {
  registerSystemRoutes(app);
  registerApiRoutes(app);
};

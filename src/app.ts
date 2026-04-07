import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { registerRoutes } from './routes/register-routes';

export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: "*",
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['Content-Range', 'X-Total-Count'],
      credentials: true
    })
  );
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.use(express.json({ limit: '5mb' }));
  registerRoutes(app);

  app.use(notFoundHandler);
  app.use(errorHandler);
  

  return app;
};

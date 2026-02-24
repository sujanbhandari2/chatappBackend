import http from 'node:http';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/prisma';
import { initializeSocketServer } from './websocket';

const bootstrap = async (): Promise<void> => {
  await prisma.$connect();

  const app = createApp();
  const httpServer = http.createServer(app);
  await initializeSocketServer(httpServer);

  httpServer.listen(env.PORT, () => {
    logger.info(`Backend listening on port ${env.PORT}`);
  });

  const shutdown = async (): Promise<void> => {
    logger.info('Shutting down backend');
    httpServer.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

bootstrap().catch(async (error) => {
  logger.error('Failed to bootstrap backend', { error: error instanceof Error ? error.message : String(error) });
  await prisma.$disconnect();
  process.exit(1);
});

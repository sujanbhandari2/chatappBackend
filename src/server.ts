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
  const io = await initializeSocketServer(httpServer);

  httpServer.listen(env.PORT, () => {
    const url = `http://localhost:${env.PORT}`;
    console.log(`Server is running at ${url}`);
    console.log(`Socket server is running at ${url.replace('http', 'ws')}`);
  });

  let shutdownStarted = false;
  let shutdownDone = false;
  let forceTimeout: ReturnType<typeof setTimeout> | undefined;

  const finishShutdown = (): void => {
    if (shutdownDone) {
      return;
    }
    shutdownDone = true;
    if (forceTimeout !== undefined) {
      clearTimeout(forceTimeout);
      forceTimeout = undefined;
    }
    void prisma.$disconnect().finally(() => {
      process.exit(0);
    });
  };

  const shutdown = (): void => {
    if (shutdownStarted) {
      if (!shutdownDone) {
        logger.warn('Repeat shutdown signal; forcing exit');
        if (typeof httpServer.closeAllConnections === 'function') {
          httpServer.closeAllConnections();
        }
        finishShutdown();
      }
      return;
    }
    shutdownStarted = true;

    logger.info('Shutting down backend');
    // Close Socket.IO first; otherwise open WebSockets keep httpServer.close() from finishing
    // and node --watch hangs on "Waiting for graceful termination..."
    io.close(() => {
      httpServer.close(() => {
        finishShutdown();
      });
    });

    const forceMs = env.NODE_ENV === 'development' ? 2000 : 15000;
    forceTimeout = setTimeout(() => {
      if (shutdownDone) {
        return;
      }
      logger.warn('Shutdown taking too long; forcing connection close');
      if (typeof httpServer.closeAllConnections === 'function') {
        httpServer.closeAllConnections();
      }
      finishShutdown();
    }, forceMs);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

bootstrap().catch(async (error) => {
  logger.error('Failed to bootstrap backend', { error: error instanceof Error ? error.message : String(error) });
  await prisma.$disconnect();
  process.exit(1);
});

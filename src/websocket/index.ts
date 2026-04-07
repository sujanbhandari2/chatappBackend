import http from 'node:http';
import Redis from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';
import { Server } from 'socket.io';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { extractSocketUser } from './socket-auth';
import { registerChatGateway } from './chat.gateway';

export const initializeSocketServer = async (server: http.Server): Promise<Server> => {
  const io = new Server(server, {
    serveClient: false,
    cors: {
      origin: env.FRONTEND_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST']
    }
  });

  if (env.NODE_ENV !== 'test') {
    const pubClient = new Redis(env.REDIS_URL);
    const subClient = pubClient.duplicate();

    pubClient.on('error', (error) => logger.error('Socket Redis pub error', { error: error.message }));
    subClient.on('error', (error) => logger.error('Socket Redis sub error', { error: error.message }));

    io.adapter(createAdapter(pubClient, subClient));
  }

  io.use(async (socket, next) => {
    try {
      const user = await extractSocketUser(socket);
      socket.data.user = user;
      next();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unauthorized';
      logger.warn('Socket handshake rejected', { reason: message });
      next(new Error(message));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;

    if (!user) {
      logger.warn('Socket connected without user context; disconnecting');
      socket.disconnect(true);
      return;
    }

    registerChatGateway(io, socket, user);
  });

  return io;
};

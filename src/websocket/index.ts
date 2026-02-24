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
    cors: {
      origin: env.FRONTEND_ORIGIN,
      credentials: true
    }
  });

  if (env.NODE_ENV !== 'test') {
    const pubClient = new Redis(env.REDIS_URL);
    const subClient = pubClient.duplicate();

    pubClient.on('error', (error) => logger.error('Socket Redis pub error', { error: error.message }));
    subClient.on('error', (error) => logger.error('Socket Redis sub error', { error: error.message }));

    io.adapter(createAdapter(pubClient, subClient));
  }

  io.use((socket, next) => {
    try {
      const user = extractSocketUser(socket);
      socket.data.user = user;
      next();
    } catch (error) {
      next(error as Error);
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;

    if (!user) {
      socket.disconnect(true);
      return;
    }

    registerChatGateway(io, socket, user);
  });

  return io;
};

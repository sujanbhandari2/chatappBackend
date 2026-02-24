import { Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt';

export interface SocketUserContext {
  userId: string;
  tenantId: string;
  role: 'CLIENT' | 'AGENT' | 'ADMIN';
  username: string;
}

export const extractSocketUser = (socket: Socket): SocketUserContext => {
  const authToken = socket.handshake.auth?.token as string | undefined;
  const headerToken = socket.handshake.headers.authorization?.replace('Bearer ', '');
  const rawToken = authToken || headerToken;

  if (!rawToken) {
    throw new Error('Unauthorized: missing token');
  }

  const payload = verifyToken(rawToken);

  return {
    userId: payload.userId,
    tenantId: payload.tenantId,
    role: payload.role,
    username: payload.username
  };
};

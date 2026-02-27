import { Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt';
import { resolveAuthIdentity, syncAuthIdentity } from '../services/auth-identity-sync.service';

export interface SocketUserContext {
  userId: string;
  tenantId: string;
  name: string;
  email: string;
  status: string;
}

export const extractSocketUser = async (socket: Socket): Promise<SocketUserContext> => {
  const authToken = socket.handshake.auth?.token as string | undefined;
  const headerToken = socket.handshake.headers.authorization?.replace('Bearer ', '');
  const rawToken = authToken || headerToken;

  if (!rawToken) {
    throw new Error('Unauthorized: missing token');
  }

  const payload = verifyToken(rawToken);
  const identity = resolveAuthIdentity(payload);
  await syncAuthIdentity(identity);

  return {
    userId: identity.userId,
    tenantId: identity.tenantId,
    name: identity.name,
    email: identity.email,
    status: identity.status
  };
};

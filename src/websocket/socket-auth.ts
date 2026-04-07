import { Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt';
import { ApiError } from '../utils/api-error';
import { resolveAuthIdentity, syncAuthIdentity } from '../services/auth-identity-sync.service';

export interface SocketUserContext {
  userId: string;
  tenantId: string;
  name: string;
  email: string;
  status: string;
}

const extractRawToken = (socket: Socket): string | undefined => {
  const fromAuth = socket.handshake.auth?.token;
  if (typeof fromAuth === 'string') {
    const t = fromAuth.trim();
    if (t) {
      return t;
    }
  }

  const authHeader = socket.handshake.headers.authorization;
  if (typeof authHeader === 'string') {
    const m = authHeader.match(/^\s*Bearer\s+(\S+)/i);
    if (m?.[1]) {
      return m[1].trim();
    }
  }

  return undefined;
};

/**
 * Requires a valid JWT on every connection. Use either:
 * - `io(url, { auth: { token: '<jwt>' } })`, or
 * - `extraHeaders: { Authorization: 'Bearer <jwt>' } }` (non-browser).
 */
export const extractSocketUser = async (socket: Socket): Promise<SocketUserContext> => {
  const rawToken = extractRawToken(socket);

  if (!rawToken) {
    throw new Error('Unauthorized: missing token');
  }

  try {
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
  } catch (err) {
    if (err instanceof ApiError) {
      throw new Error(`Unauthorized: ${err.message}`);
    }
    throw new Error('Unauthorized: invalid or expired token');
  }
};

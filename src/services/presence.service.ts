import { redis } from '../config/redis';

const ONLINE_KEY_PREFIX = 'presence:user:';
const localPresence = new Set<string>();

const userKey = (tenantId: string, userId: string): string => `${ONLINE_KEY_PREFIX}${tenantId}:${userId}`;

export const setUserOnline = async (tenantId: string, userId: string): Promise<void> => {
  if (!redis) {
    localPresence.add(`${tenantId}:${userId}`);
    return;
  }

  await redis.set(userKey(tenantId, userId), '1');
};

export const setUserOffline = async (tenantId: string, userId: string): Promise<void> => {
  if (!redis) {
    localPresence.delete(`${tenantId}:${userId}`);
    return;
  }

  await redis.del(userKey(tenantId, userId));
};

export const isUserOnline = async (tenantId: string, userId: string): Promise<boolean> => {
  if (!redis) {
    return localPresence.has(`${tenantId}:${userId}`);
  }

  const value = await redis.get(userKey(tenantId, userId));
  return value === '1';
};

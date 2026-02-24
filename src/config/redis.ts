import Redis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

let redis: Redis | null = null;

if (env.NODE_ENV !== 'test') {
  redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true
  });

  redis.on('error', (error) => {
    logger.error('Redis error', { error: error.message });
  });
}

export { redis };

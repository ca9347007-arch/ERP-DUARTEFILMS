import Redis from 'ioredis';
import { env } from '../config/env.js';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 2,
  lazyConnect: true
});

export async function tryRedisPing() {
  try {
    if (redis.status === 'wait') await redis.connect();
    return await redis.ping();
  } catch {
    return 'DISABLED_OR_OFFLINE';
  }
}

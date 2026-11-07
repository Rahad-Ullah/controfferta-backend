import Redis from 'ioredis';
import config from '.';

export const redis = new Redis(config.redis_url || 'redis://localhost:6379', {
  maxRetriesPerRequest: null, // Required by BullMQ
});

// src/utils/redis.js
import Redis from 'ioredis';

let redisClient = null;
let pubClient = null;
let subClient = null;

const createRedisClient = () => {
  const client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
  });

  client.on('error', (err) => console.error('[Redis] Error:', err.message));
  client.on('connect', () => console.log('[Redis] Connected'));
  return client;
};

export const createIsolatedRedisClient = () => createRedisClient();

export const getRedisClient = () => {
  if (!redisClient) redisClient = createRedisClient();
  return redisClient;
};

export const getPubClient = () => {
  if (!pubClient) pubClient = createRedisClient();
  return pubClient;
};

export const getSubClient = () => {
  if (!subClient) subClient = createRedisClient();
  return subClient;
};

export default getRedisClient;

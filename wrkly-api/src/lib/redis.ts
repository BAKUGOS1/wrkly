import Redis from 'ioredis';

// Validate REDIS_URL to prevent startup crashes with invalid connection strings
let redisUrl = process.env.REDIS_URL;

// If we got a raw hostname from Railway instead of a proper connection string
if (redisUrl && !redisUrl.startsWith('redis://') && !redisUrl.startsWith('rediss://')) {
  console.warn(`[redis] REDIS_URL is malformed ("${redisUrl}"). Disabling Redis connection.`);
  // Clear it so we don't try to connect to an invalid schema
  redisUrl = undefined;
}

const isRedisEnabled = !!redisUrl;

const redis = new Redis(isRedisEnabled ? redisUrl! : 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  // If Redis is not configured, disable auto-connect so we don't crash at boot
  lazyConnect: !isRedisEnabled,
});

if (isRedisEnabled) {
  console.log('[redis] Client initialized');
} else {
  console.warn('[redis] REDIS_URL not set or invalid. Redis client running in disjoint mode (disconnected).');
}

redis.on('error', (error: Error) => {
  // Suppress "connection refused to 127.0.0.1" if we deliberately disabled it
  if (!isRedisEnabled && error.message.includes('ECONNREFUSED')) return;
  console.error('[redis] Connection error:', error.message);
});

export default redis;

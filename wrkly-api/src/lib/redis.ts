import Redis from 'ioredis';

let redisUrl = process.env.REDIS_URL;

// If Railway injects a raw hostname (like "redis.railway.internal") without a protocol
if (redisUrl && !redisUrl.startsWith('redis://') && !redisUrl.startsWith('rediss://')) {
  // Strip any literal quotes that might have snuck in from CLI env var setting
  redisUrl = redisUrl.replace(/^["']|["']$/g, '');
  if (!redisUrl.startsWith('redis://') && !redisUrl.startsWith('rediss://')) {
    redisUrl = `redis://${redisUrl}`;
  }
}

const isRedisEnabled = !!redisUrl;

const redis = new Redis(isRedisEnabled ? redisUrl! : 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  // If Redis is not configured, disable auto-connect so we don't crash at boot
  lazyConnect: !isRedisEnabled,
});

if (isRedisEnabled) {
  console.log('[redis] Client initialized securely');
} else {
  console.warn('[redis] REDIS_URL not set. Redis client running in disjoint mode.');
}

redis.on('error', (error: Error) => {
  if (!isRedisEnabled && error.message.includes('ECONNREFUSED')) return;
  console.error('[redis] Connection error:', error.message);
});

export default redis;

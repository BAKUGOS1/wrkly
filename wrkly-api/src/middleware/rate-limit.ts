import type { FastifyRequest, FastifyReply } from 'fastify';
import redis from '../lib/redis';

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}

export function createRateLimit(options: RateLimitOptions) {
  return async function rateLimitPreHandler(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    try {
      if (!request.userId) {
        return;
      }

      const key = `ratelimit:${options.keyPrefix}:${request.userId}`;
      const expiresAt = Math.floor((Date.now() + options.windowMs) / 1000);

      // incr, if no expiry set expiry, get ttl
      const r = await redis.multi()
        .incr(key)
        .pttl(key)
        .exec();

      if (!r || r.length !== 2) return;

      const [incrErr, count] = r[0] as [Error | null, number];
      const [pttlErr, pttl] = r[1] as [Error | null, number];

      if (incrErr || pttlErr) {
        request.log.warn({ err: incrErr || pttlErr }, 'Redis error during rate limit calculation');
        return;
      }

      if (count === 1) {
        await redis.pexpire(key, options.windowMs);
      }

      const remainingInWindow = pttl > 0 ? Math.ceil(pttl / 1000) : Math.ceil(options.windowMs / 1000);
      const remainingRequests = Math.max(0, options.maxRequests - count);

      reply.header('X-RateLimit-Limit', options.maxRequests);
      reply.header('X-RateLimit-Remaining', remainingRequests);
      reply.header('X-RateLimit-Reset', expiresAt);

      if (count > options.maxRequests) {
        return reply.status(429).send({
          error: 'Rate limit exceeded',
          retryAfter: remainingInWindow,
        });
      }
    } catch (err) {
      request.log.warn({ err }, 'Redis rate limiting failed, allowing request to proceed');
    }
  };
}

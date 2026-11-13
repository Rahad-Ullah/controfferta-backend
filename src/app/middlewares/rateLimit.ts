/**
 * @fileoverview Reusable Redis-backed Rate Limiter Middleware Factory
 * @module shared/middlewares/rateLimiter
 *
 * @description
 * Creates distributed rate limiters using Redis as the centralized store.
 * Automatically keys requests by authenticated user ID (`req.user._id`),
 * falling back to the client IP address (`req.ip`) for unauthenticated routes.
 *
 * @example
 * ```typescript
 * import { rateLimiter } from './rateLimiter';
 *
 * const ocrLimiter = rateLimiter({
 *   prefix: 'receipt_ai',
 *   windowMs: 60 * 1000,
 *   max: 10,
 *   message: 'Scan limit reached. Please wait a minute.'
 * });
 *
 * router.post('/ocr-ai-extraction', ocrLimiter, ReceiptController.parseOcr);
 * ```
 */

import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { Request } from 'express';
import { redis } from '../../config/redis';
import { ipKeyGenerator } from 'express-rate-limit';
import crypto from 'crypto';

export interface RateLimitOptions {
  /** Unique namespace identifier for the route/feature (e.g., 'auth_login', 'receipt_ai') */
  prefix: string;
  /** Time window in milliseconds (defaults to 1 minute: 60,000 ms) */
  windowMs?: number;
  /** Maximum number of allowed requests within the `windowMs` timeframe */
  max: number;
  /** Custom error response message when the limit is exceeded */
  message?: string;
}

/**
 * Generates an Express rate-limiting middleware backed by Redis.
 *
 * @param {RateLimitOptions} options - Configuration options for the limiter.
 * @returns {import('express').RequestHandler} Express rate limit middleware.
 */
export const rateLimiter = ({
  prefix,
  windowMs = 60 * 1000, // 1 minute
  max = 10, // 10 requests per minute
  message = 'Too many requests. Please slow down and try again later.',
}: RateLimitOptions) => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message,
    },
    keyGenerator: (req: Request): string => {
      // 1. Authenticated User ID (Most accurate)
      const userId = (req as any).user?.id?.toString();
      if (userId) return `user:${userId}`;

      // 2. Custom Device/Browser ID Header (Sent by frontend if available)
      const deviceId = req.headers['x-device-id'] || (req as any).cookies?.deviceId;
      if (deviceId) return `device:${deviceId}`;

      // 3. Fallback: Combine IP with a short hash of the User-Agent 
      // (Helps separate different browsers sharing the same IP address)
      const ip = ipKeyGenerator(req.ip as string) || 'unknown-ip';
      const userAgent = req.headers['user-agent'] || 'unknown-ua';

      // Create a quick short hash of the user agent
      const uaHash = crypto.createHash('md5').update(userAgent).digest('hex').substring(0, 8);

      return `ip-ua:${ip}:${uaHash}`;
    },
    store: new RedisStore({
      // @ts-expect-error ioredis call overloads do not match the store command type
      sendCommand: (command: string, ...args: string[]) =>
        redis.call(command, ...args),
      prefix: `rl:${prefix}:`,
    }),
  });
};

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
  windowMs = 60 * 1000,
  max,
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
      // Prioritize authenticated user ID, fallback to client IP
      return (
        (req as any).user?.id?.toString() ||
        ipKeyGenerator(req.ip as string) ||
        'anonymous'
      );
    },
    store: new RedisStore({
      // @ts-ignore
      sendCommand: (command: string, ...args: string[]) =>
        redis.call(command, ...args),
      prefix: `rl:${prefix}:`,
    }),
  });
};

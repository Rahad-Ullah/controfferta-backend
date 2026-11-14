import { createHmac, timingSafeEqual } from 'crypto';
import config from '../config';
import { redis } from '../config/redis';
import { OTP_ATTEMPT_TTL_SECONDS } from '../app/modules/auth/auth.constant';

const otpAttemptKey = (userId: string) => `otp:attempts:${userId}`;

const getOtpAttempts = async (userId: string) => {
  const value = await redis.get(otpAttemptKey(userId));
  return Number(value ?? 0);
};

const recordWrongOtp = async (userId: string) => {
  const key = otpAttemptKey(userId);
  const attemptCount = await redis.incr(key);
  if (attemptCount === 1) {
    await redis.expire(key, OTP_ATTEMPT_TTL_SECONDS);
  }
  return attemptCount;
};

const clearOtpAttempts = async (userId: string) => {
  await redis.del(otpAttemptKey(userId));
};

const hashOtp = (otp: number) =>
  createHmac('sha256', config.crypto_secret as string)
    .update(String(otp))
    .digest('hex');

const otpMatches = (otp: number, storedHash: string) => {
  const next = Buffer.from(hashOtp(otp), 'hex');
  const stored = Buffer.from(storedHash, 'hex');
  if (next.length !== stored.length) {
    return false;
  }

  return timingSafeEqual(next, stored);
};

export {
  clearOtpAttempts,
  getOtpAttempts,
  hashOtp,
  otpMatches,
  recordWrongOtp,
};

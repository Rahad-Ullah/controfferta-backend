export const AUTH_SESSION_KEY_PREFIX = 'auth:session';
export const AUTH_USER_SESSIONS_KEY_PREFIX = 'auth:sessions';

export const OTP_ATTEMPT_LIMIT = 5;
export const OTP_TTL_MS = 5 * 60 * 1000;  // 5 minutes
export const OTP_ATTEMPT_TTL_SECONDS = OTP_TTL_MS / 1000;

export const LOCKED_OTP_MESSAGE =
  'Too many incorrect codes. Request a new one.';


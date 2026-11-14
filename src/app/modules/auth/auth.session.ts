import crypto from 'crypto';
import config from '../../../config';
import { redis } from '../../../config/redis';
import { jwtHelper } from '../../../helpers/jwtHelper';
import {
  AUTH_SESSION_KEY_PREFIX,
  AUTH_USER_SESSIONS_KEY_PREFIX,
} from './auth.constant';
import { UserSession, SessionClient } from './auth.interface';

// Lookup key for one session.
const sessionKey = (sessionId: string) =>
  `${AUTH_SESSION_KEY_PREFIX}:${sessionId}`;

// The user's set of session ids.
const userSessionsKey = (userId: string) =>
  `${AUTH_USER_SESSIONS_KEY_PREFIX}:${userId}`;

// Session lifetime follows the refresh token. The token itself is not stored.
const sessionTtlSeconds = (refreshToken: string) => {
  const decoded = jwtHelper.verifyToken(
    refreshToken,
    config.jwt.jwt_refresh_secret!,
  );
  const exp = typeof decoded.exp === 'number' ? decoded.exp : 0;
  return Math.max(exp - Math.floor(Date.now() / 1000), 1);
};

// Active sessions for the user. Drop ids whose record has already expired.
const listLoginSessions = async (userId: string) => {
  const ids = await redis.smembers(userSessionsKey(userId));
  const sessions: UserSession[] = [];

  for (const id of ids) {
    const raw = await redis.get(sessionKey(id));
    if (!raw) {
      await redis.srem(userSessionsKey(userId), id);
      continue;
    }

    sessions.push(JSON.parse(raw) as UserSession);
  }

  return sessions;
};

// New id for a login.
const newSessionId = () => crypto.randomBytes(16).toString('hex');

// Load one session by its id.
const readSession = async (sessionId: string) => {
  if (!sessionId) return null;
  const raw = await redis.get(sessionKey(sessionId));
  if (!raw) return null;
  return JSON.parse(raw) as UserSession;
};

// Save the session under its id for the life of the refresh token.
const createUserSession = async (
  sessionId: string,
  userId: string,
  refreshToken: string,
  client: SessionClient,
): Promise<UserSession> => {
  const ttlSeconds = sessionTtlSeconds(refreshToken);
  const session: UserSession = {
    id: sessionId,
    userId,
    userAgent: client.userAgent || 'unknown',
    ip: client.ip || '',
    createdAt: new Date().toISOString(),
  };

  await redis.set(
    sessionKey(sessionId),
    JSON.stringify(session),
    'EX',
    ttlSeconds,
  );
  await redis.sadd(userSessionsKey(userId), sessionId);
  await redis.expire(userSessionsKey(userId), ttlSeconds);

  return session;
};

// Keep the same session and give it the new refresh token's lifetime.
const extendUserSession = async (sessionId: string, refreshToken: string) => {
  const session = await readSession(sessionId);
  if (!session) return;

  const ttlSeconds = sessionTtlSeconds(refreshToken);
  await redis.expire(sessionKey(sessionId), ttlSeconds);
  await redis.expire(userSessionsKey(session.userId), ttlSeconds);
};

// Remove one session when it belongs to this user.
const revokeLoginSession = async (userId: string, sessionId: string) => {
  const session = await readSession(sessionId);
  if (!session || session.userId !== userId) return false;

  await redis.del(sessionKey(sessionId));
  await redis.srem(userSessionsKey(userId), sessionId);
  return true;
};

// Remove every session for the user.
const revokeAllLoginSessions = async (userId: string) => {
  const ids = await redis.smembers(userSessionsKey(userId));
  if (ids.length) {
    await redis.del(...ids.map(sessionKey));
  }
  await redis.del(userSessionsKey(userId));
};

export const AuthSession = {
  newSessionId,
  createUserSession,
  extendUserSession,
  readSession,
  listLoginSessions,
  revokeLoginSession,
  revokeAllLoginSessions,
};

import crypto from 'crypto';
import config from '../../../config';
import { redis } from '../../../config/redis';
import { jwtHelper } from '../../../helpers/jwtHelper';
import {
  AUTH_SESSION_KEY_PREFIX,
  AUTH_USER_SESSIONS_KEY_PREFIX,
} from './auth.constant';
import { LoginSession, SessionClient } from './auth.interface';

// Redis record. The refresh-token hash is not returned to the client.
type StoredSession = LoginSession & {
  userId: string;
  tokenHash: string;
};

// One session record.
const sessionKey = (sessionId: string) =>
  `${AUTH_SESSION_KEY_PREFIX}:${sessionId}`;

// The user's set of session ids.
const userSessionsKey = (userId: string) =>
  `${AUTH_USER_SESSIONS_KEY_PREFIX}:${userId}`;

// Hash stored instead of the refresh token.
const hashToken = (token: string) =>
  crypto.createHash('sha256').update(token).digest('hex');

// Redis TTL follows the refresh token expiry.
const refreshTtlSeconds = (refreshToken: string) => {
  const decoded = jwtHelper.verifyToken(
    refreshToken,
    config.jwt.jwt_refresh_secret!,
  );
  const exp = typeof decoded.exp === 'number' ? decoded.exp : 0;
  return Math.max(exp - Math.floor(Date.now() / 1000), 1);
};

// Public session fields, without the token hash.
const toLoginSession = (session: StoredSession): LoginSession => ({
  id: session.id,
  userAgent: session.userAgent,
  ip: session.ip,
  createdAt: session.createdAt,
});

// Drop ids whose session record has already expired.
const readUserSessions = async (userId: string) => {
  const ids = await redis.smembers(userSessionsKey(userId));
  const sessions: StoredSession[] = [];

  for (const id of ids) {
    const raw = await redis.get(sessionKey(id));
    if (!raw) {
      await redis.srem(userSessionsKey(userId), id);
      continue;
    }

    sessions.push(JSON.parse(raw) as StoredSession);
  }

  return sessions;
};

// New id for a login.
const newSessionId = () => crypto.randomBytes(16).toString('hex');

// Load one session.
const readSession = async (sessionId: string) => {
  if (!sessionId) return null;
  const raw = await redis.get(sessionKey(sessionId));
  if (!raw) return null;
  return JSON.parse(raw) as StoredSession;
};

// Save the session for the life of the refresh token.
const createLoginSession = async (
  sessionId: string,
  userId: string,
  refreshToken: string,
  client: SessionClient,
) => {
  const session: StoredSession = {
    id: sessionId,
    userId,
    tokenHash: hashToken(refreshToken),
    userAgent: client.userAgent || 'unknown',
    ip: client.ip || '',
    createdAt: new Date().toISOString(),
  };
  const ttl = refreshTtlSeconds(refreshToken);

  await redis.set(sessionKey(sessionId), JSON.stringify(session), 'EX', ttl);
  await redis.sadd(userSessionsKey(userId), sessionId);
  await redis.expire(userSessionsKey(userId), ttl);

  return toLoginSession(session);
};

// The session belongs to this user and this refresh token.
const matchesRefreshToken = (
  session: StoredSession | null,
  userId: string,
  refreshToken: string,
) =>
  Boolean(
    session &&
      session.userId === userId &&
      session.tokenHash === hashToken(refreshToken),
  );

// Active sessions for the user, without the token hash.
const listLoginSessions = async (userId: string) => {
  const sessions = await readUserSessions(userId);
  return sessions.map(toLoginSession);
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
  createLoginSession,
  readSession,
  matchesRefreshToken,
  listLoginSessions,
  revokeLoginSession,
  revokeAllLoginSessions,
};

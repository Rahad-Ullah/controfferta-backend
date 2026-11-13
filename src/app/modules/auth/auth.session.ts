import crypto from 'crypto';
import config from '../../../config';
import { redis } from '../../../config/redis';
import { jwtHelper } from '../../../helpers/jwtHelper';

export type SessionClient = {
  userAgent: string;
  ip: string;
};

export type ActiveSession = {
  id: string;
  userAgent: string;
  ip: string;
  createdAt: string;
};

type StoredSession = ActiveSession & {
  userId: string;
  tokenHash: string;
};

const sessionKey = (sessionId: string) => `auth:session:${sessionId}`;
const userSessionsKey = (userId: string) => `auth:sessions:${userId}`;

const hashToken = (token: string) =>
  crypto.createHash('sha256').update(token).digest('hex');

const refreshTtlSeconds = (refreshToken: string) => {
  const decoded = jwtHelper.verifyToken(
    refreshToken,
    config.jwt.jwt_refresh_secret!,
  );
  const exp = typeof decoded.exp === 'number' ? decoded.exp : 0;
  return Math.max(exp - Math.floor(Date.now() / 1000), 1);
};

const toActiveSession = (session: StoredSession): ActiveSession => ({
  id: session.id,
  userAgent: session.userAgent,
  ip: session.ip,
  createdAt: session.createdAt,
});

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

const newSessionId = () => crypto.randomBytes(16).toString('hex');

const readSession = async (sessionId: string) => {
  if (!sessionId) return null;
  const raw = await redis.get(sessionKey(sessionId));
  if (!raw) return null;
  return JSON.parse(raw) as StoredSession;
};

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

  return toActiveSession(session);
};

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

const listLoginSessions = async (userId: string) => {
  const sessions = await readUserSessions(userId);
  return sessions.map(toActiveSession);
};

const revokeLoginSession = async (userId: string, sessionId: string) => {
  const session = await readSession(sessionId);
  if (!session || session.userId !== userId) return false;

  await redis.del(sessionKey(sessionId));
  await redis.srem(userSessionsKey(userId), sessionId);
  return true;
};

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

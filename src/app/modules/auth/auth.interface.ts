export type UserSession = {
  id: string;
  userId: string;
  userAgent: string;
  ip: string;
  createdAt: string;
};

export type SessionClient = {
  userAgent: string;
  ip: string;
};

export type SessionUser = {
  _id: unknown;
  role: string;
};

export type SessionTokens = {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  role: string;
  _id: unknown;
};

// Claims on every access and refresh token. Redis holds the session, not the token.
export type AuthTokenPayload = {
  id: string;
  role: string;
  sid: string;
  iat?: number;
  exp?: number;
};

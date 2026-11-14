export type SessionClient = {
  userAgent: string;
  ip: string;
};

// Login session record stored in Redis and returned by the session list.
export type LoginSession = {
  id: string;
  userAgent: string;
  ip: string;
  createdAt: string;
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

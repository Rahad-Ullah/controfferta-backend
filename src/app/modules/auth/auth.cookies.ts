import { NextFunction, Request, Response } from 'express';
import config from '../../../config';

export const AUTH_COOKIE = {
  access: 'accessToken',
  refresh: 'refreshToken',
} as const;

// Covers every API version. /api/v1 matches. /api/v2 will too.
const API_PATH = '/api';

const EXPIRE_UNITS_MS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

// Browsers and WebViews send these headers. Page script cannot. Native apps omit them.
export const isBrowserRequest = (req: Request) =>
  Boolean(
    req.get('sec-fetch-mode') ||
      req.get('sec-fetch-site') ||
      req.get('sec-fetch-dest'),
  );

const parseUrl = (value?: string) => {
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

// localhost and an IP are their own site. Other hosts use the last two labels.
const siteKey = (hostname: string) => {
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)
  ) {
    return hostname;
  }

  const labels = hostname.split('.').filter(Boolean);
  if (labels.length <= 2) return hostname;
  return labels.slice(-2).join('.');
};

const hostnameOf = (value?: string) =>
  parseUrl(value)?.hostname.toLowerCase() ?? '';

// A web app on another site forces SameSite=None for every client.
const isCrossSite = () => {
  const backend = hostnameOf(config.backend_url);
  if (!backend) return false;

  const apiSite = siteKey(backend);
  return [config.frontend_url, config.dashboard_url].some(url => {
    const host = hostnameOf(url);
    return Boolean(host) && siteKey(host) !== apiSite;
  });
};

// "1d" style JWT expiry. Anything else lasts one day.
const maxAgeMs = (expiresIn: string | undefined, fallback: string) => {
  const match = /^(\d+)([smhd])$/.exec((expiresIn || fallback).trim());
  if (!match) return EXPIRE_UNITS_MS.d;
  return Number(match[1]) * EXPIRE_UNITS_MS[match[2]];
};

// Omit maxAge when clearing so the browser drops the cookie immediately.
const cookieOptions = (maxAge?: number) => {
  const sameSite: 'lax' | 'none' = isCrossSite() ? 'none' : 'lax';
  const httpsBackend = (config.backend_url || '').startsWith('https://');

  return {
    httpOnly: true,
    path: API_PATH,
    sameSite,
    secure:
      sameSite === 'none' || httpsBackend || config.node_env === 'production',
    ...(maxAge === undefined ? {} : { maxAge }),
  };
};

// Set both cookies at once. Access covers all API routes. Refresh only the refresh route.
export const setAuthCookies = (
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
) => {
  res.cookie(
    AUTH_COOKIE.access,
    tokens.accessToken,
    cookieOptions(maxAgeMs(config.jwt.jwt_expire_in, '1d')),
  );
  res.cookie(
    AUTH_COOKIE.refresh,
    tokens.refreshToken,
    cookieOptions(maxAgeMs(config.jwt.jwt_refresh_expire_in, '7d')),
  );
};

// Refresh replaces the access cookie and leaves the refresh cookie in place.
export const setAccessCookie = (res: Response, accessToken: string) => {
  res.cookie(
    AUTH_COOKIE.access,
    accessToken,
    cookieOptions(maxAgeMs(config.jwt.jwt_expire_in, '1d')),
  );
};

export const clearAuthCookies = (res: Response) => {
  res.clearCookie(AUTH_COOKIE.access, cookieOptions());
  res.clearCookie(AUTH_COOKIE.refresh, cookieOptions());
};

// Website, dashboard, and this API. Empty or invalid URLs are skipped.
const trustedOrigins = () =>
  [config.frontend_url, config.dashboard_url, config.backend_url].flatMap(
    value => {
      const origin = parseUrl(value)?.origin;
      return origin ? [origin] : [];
    },
  );

// Development may call from any localhost port.
const isDevLocalhost = (origin: string) => {
  if (config.node_env !== 'development') return false;

  const hostname = parseUrl(origin)?.hostname.toLowerCase() ?? '';
  return (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === '127.0.0.1'
  );
};

export const isTrustedOrigin = (origin: string) =>
  trustedOrigins().includes(origin) || isDevLocalhost(origin);

// The browser sends the refresh token as a cookie. Copy it into the body for validation.
export const preferRefreshCookie = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const refreshToken = req.cookies?.[AUTH_COOKIE.refresh];
  if (
    isBrowserRequest(req) &&
    typeof refreshToken === 'string' &&
    refreshToken
  ) {
    req.body = { ...(req.body ?? {}), refreshToken };
  }

  next();
};

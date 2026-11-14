import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Secret } from 'jsonwebtoken';
import config from '../../config';
import ApiError from '../../errors/ApiError';
import { jwtHelper } from '../../helpers/jwtHelper';
import { AUTH_COOKIE } from '../modules/auth/auth.cookies';

const bearerToken = (header?: string) => {
  if (!header?.startsWith('Bearer')) return '';
  return header.split(' ')[1] || '';
};

const auth =
  (...roles: string[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const fromHeader = bearerToken(req.headers.authorization);
      const cookieToken = req.cookies?.[AUTH_COOKIE.access];
      const fromCookie = typeof cookieToken === 'string' ? cookieToken : '';
      const token = fromHeader || fromCookie;

      if (!token) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, 'You are not authorized');
      }

      const verifyUser = jwtHelper.verifyToken(
        token,
        config.jwt.jwt_secret as Secret,
      );
      req.user = verifyUser;

      if (roles.length && !roles.includes(verifyUser.role)) {
        throw new ApiError(
          StatusCodes.FORBIDDEN,
          "You don't have permission to access this api",
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };

export default auth;

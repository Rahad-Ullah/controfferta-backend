import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Secret } from 'jsonwebtoken';
import config from '../../../config';
import ApiError from '../../../errors/ApiError';
import { jwtHelper } from '../../../helpers/jwtHelper';
import sendResponse from '../../../shared/sendResponse';
import { getOtpAttempts, recordWrongOtp } from '../../../utils/otp';
import { LOCKED_OTP_MESSAGE, OTP_ATTEMPT_LIMIT } from './auth.constant';
import { isBrowserRequest, setAuthCookies } from './auth.cookies';
import { SessionTokens, SessionClient, SessionUser } from './auth.interface';
import { AuthSession } from './auth.session';

// Remaining tries after a wrong code.
const wrongOtpMessage = (attemptsLeft: number) =>
  `Wrong OTP, ${attemptsLeft} attempts left`;

// Record a wrong code and throw once the attempt limit is reached.
const failOtpAttempt = async (attemptKey: string): Promise<never> => {
  const attempts = await getOtpAttempts(attemptKey);
  if (attempts >= OTP_ATTEMPT_LIMIT) {
    throw new ApiError(StatusCodes.BAD_REQUEST, LOCKED_OTP_MESSAGE);
  }

  const attemptCount = await recordWrongOtp(attemptKey);
  const locked = attemptCount >= OTP_ATTEMPT_LIMIT;
  throw new ApiError(
    StatusCodes.BAD_REQUEST,
    locked
      ? LOCKED_OTP_MESSAGE
      : wrongOtpMessage(OTP_ATTEMPT_LIMIT - attemptCount),
  );
};

// Create the access token, refresh token, and Redis session for this login.
const issueSessionTokens = async (
  user: SessionUser,
  client: SessionClient,
): Promise<SessionTokens> => {
  const sessionId = AuthSession.newSessionId();
  const accessToken = jwtHelper.createToken(
    { id: user._id, role: user.role, sid: sessionId },
    config.jwt.jwt_secret as Secret,
    config.jwt.jwt_expire_in as string,
  );
  const refreshToken = jwtHelper.createToken(
    { id: user._id, role: user.role, sid: sessionId },
    config.jwt.jwt_refresh_secret as Secret,
    config.jwt.jwt_refresh_expire_in as string,
  );
  const session = await AuthSession.createUserSession(
    sessionId,
    String(user._id),
    refreshToken,
    client,
  );

  return {
    accessToken,
    refreshToken,
    sessionId: session.id,
    role: user.role,
    _id: user._id,
  };
};

// Browser and IP stored with the login session.
export const getSessionClient = (req: Request): SessionClient => ({
  userAgent: req.get('user-agent') || 'unknown',
  ip: req.ip || '',
});

// Verify if the data is a session tokens.
export const isSessionTokens = (data: object): data is SessionTokens =>
  'accessToken' in data && 'refreshToken' in data;

// Browsers receive cookies. Other clients receive the tokens in the body.
const sendSessionTokens = (
  req: Request,
  res: Response,
  message: string,
  tokens: SessionTokens,
) => {
  if (isBrowserRequest(req)) {
    setAuthCookies(res, tokens);
    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message,
      data: {
        sessionId: tokens.sessionId,
        role: tokens.role,
        _id: tokens._id,
      },
    });
    return;
  }

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message,
    data: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      sessionId: tokens.sessionId,
      role: tokens.role,
      _id: tokens._id,
    },
  });
};

export const AuthHelper = {
  failOtpAttempt,
  issueSessionTokens,
  getSessionClient,
  isSessionTokens,
  sendSessionTokens,
};

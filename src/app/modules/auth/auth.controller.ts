import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import {
  clearAuthCookies,
  isBrowserRequest,
  setAccessCookie,
} from './auth.cookies';
import { AuthHelper, getSessionClient, isSessionTokens } from './auth.helper';
import { AuthService } from './auth.service';

// ------------------- login user -------------------
const loginUser = catchAsync(async (req: Request, res: Response) => {
  const { ...loginData } = req.body;
  const result = await AuthService.loginUserFromDB(
    loginData,
    getSessionClient(req),
  );

  AuthHelper.sendSessionTokens(
    req,
    res,
    'User logged in successfully.',
    result,
  );
});

// ------------------- forget password -------------------
const forgetPassword = catchAsync(async (req: Request, res: Response) => {
  const email = req.body.email;
  const result = await AuthService.forgetPasswordToDB(email);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message:
      'Please check your email. We have sent you a one-time passcode (OTP).',
    data: result,
  });
});

// ------------------- verify email -------------------
const verifyEmail = catchAsync(async (req: Request, res: Response) => {
  const { ...verifyData } = req.body;
  const result = await AuthService.verifyEmailToDB(
    verifyData,
    getSessionClient(req),
  );

  if (isSessionTokens(result.data)) {
    AuthHelper.sendSessionTokens(req, res, result.message, result.data);
    return;
  }

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: result.message,
    data: result.data,
  });
});

// ------------------- reset password -------------------
const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const token = req.headers.authorization;
  const { ...resetData } = req.body;
  const result = await AuthService.resetPasswordToDB(token!, resetData);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Your password has been successfully reset.',
    data: result,
  });
});

// ------------------- change password -------------------
const changePassword = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const { ...passwordData } = req.body;
  await AuthService.changePasswordToDB(user, passwordData);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Your password has been successfully changed',
  });
});

// ------------------- logout -------------------
const logout = catchAsync(async (req: Request, res: Response) => {
  await AuthService.logoutFromDB(req.user.id, req.body.sessionId);
  if (isBrowserRequest(req)) clearAuthCookies(res);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Logged out successfully',
  });
});

// ------------------- logout all -------------------
const logoutAll = catchAsync(async (req: Request, res: Response) => {
  await AuthService.logoutAllFromDB(req.user.id);
  if (isBrowserRequest(req)) clearAuthCookies(res);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Logged out from all sessions successfully',
  });
});

// ------------------- list sessions -------------------
const listSessions = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.listSessionsFromDB(req.user.id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Active sessions retrieved successfully',
    data: result,
  });
});

// ------------------- refresh token -------------------
const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.refreshTokenToDB(req.body.refreshToken);

  if (isBrowserRequest(req)) {
    setAccessCookie(res, result.accessToken);
    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Token refreshed successfully',
    });
    return;
  }

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Token refreshed successfully',
    data: result,
  });
});

export const AuthController = {
  verifyEmail,
  loginUser,
  forgetPassword,
  resetPassword,
  changePassword,
  refreshToken,
  logout,
  logoutAll,
  listSessions,
};

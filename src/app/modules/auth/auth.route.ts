import express from 'express';
import auth from '../../middlewares/auth';
import { rateLimiter } from '../../middlewares/rateLimit';
import validateRequest from '../../middlewares/validateRequest';
import { AuthController } from './auth.controller';
import { AuthValidation } from './auth.validation';
const router = express.Router();

const loginLimiter = rateLimiter({
  prefix: 'auth_login',
  windowMs: 15 * 60 * 1000,
  max: 10,
});

const otpLimiter = rateLimiter({
  prefix: 'auth_otp',
  windowMs: 15 * 60 * 1000,
  max: 5,
});

const verifyEmailLimiter = rateLimiter({
  prefix: 'auth_verify_email',
  windowMs: 15 * 60 * 1000,
  max: 10,
});

const resetPasswordLimiter = rateLimiter({
  prefix: 'auth_reset_password',
  windowMs: 15 * 60 * 1000,
  max: 10,
});

router.post(
  '/login',
  loginLimiter,
  validateRequest(AuthValidation.createLoginZodSchema),
  AuthController.loginUser,
);

router.post(
  '/forget-password',
  otpLimiter,
  validateRequest(AuthValidation.createForgetPasswordZodSchema),
  AuthController.forgetPassword,
);

router.post(
  '/generate-otp',
  otpLimiter,
  validateRequest(AuthValidation.createForgetPasswordZodSchema),
  AuthController.forgetPassword,
);

router.post(
  '/verify-email',
  verifyEmailLimiter,
  validateRequest(AuthValidation.createVerifyEmailZodSchema),
  AuthController.verifyEmail,
);

router.post(
  '/reset-password',
  resetPasswordLimiter,
  validateRequest(AuthValidation.createResetPasswordZodSchema),
  AuthController.resetPassword,
);

router.post(
  '/change-password',
  auth(),
  validateRequest(AuthValidation.createChangePasswordZodSchema),
  AuthController.changePassword,
);

router.post(
  '/refresh-token',
  validateRequest(AuthValidation.refreshTokenZodSchema),
  AuthController.refreshToken,
);

export const AuthRoutes = router;

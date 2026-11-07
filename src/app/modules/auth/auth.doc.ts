import { z } from '../../../api-docs/zod';
import { registerApiRoute } from '../../../helpers/openapi-helper';
import { AuthValidation } from './auth.validation';

export function registerAuthDocs() {
  const registerAuth = (opts: Parameters<typeof registerApiRoute>[0]) => {
    registerApiRoute({ tags: ['Auth'], ...opts });
  };

  registerAuth({
    method: 'post',
    path: '/auth/login',
    summary: 'User login',
    body: AuthValidation.createLoginZodSchema.shape.body,
  });

  registerAuth({
    method: 'post',
    path: '/auth/forget-password',
    summary: 'User forget password',
    body: AuthValidation.createForgetPasswordZodSchema.shape.body,
  });

  registerAuth({
    method: 'post',
    path: '/auth/verify-email',
    summary: 'User verify email',
    body: AuthValidation.createVerifyEmailZodSchema.shape.body,
  });

  registerAuth({
    method: 'post',
    path: '/auth/reset-password',
    summary: 'User reset password',
    headers: z.object({
      authorization: z.string().openapi({ description: 'Raw reset token' }),
    }),
    body: AuthValidation.createResetPasswordZodSchema.shape.body,
  });

  registerAuth({
    method: 'post',
    path: '/auth/change-password',
    summary: 'User change password',
    isAuth: true,
    body: AuthValidation.createChangePasswordZodSchema.shape.body,
  });

  registerAuth({
    method: 'post',
    path: '/auth/refresh-token',
    summary: 'User refresh token',
    isAuth: false,
    body: AuthValidation.refreshTokenZodSchema.shape.body,
  });
}

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
    summary:
      'Log in. Browsers get HttpOnly cookies. Other clients get tokens in the body.',
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
    summary:
      'Refresh the access token from the refresh cookie or the JSON body.',
    isAuth: false,
    body: AuthValidation.refreshTokenZodSchema.shape.body,
  });

  registerAuth({
    method: 'post',
    path: '/auth/logout',
    summary: 'Log out active session',
    isAuth: true,
    body: AuthValidation.logoutZodSchema.shape.body,
  });

  registerAuth({
    method: 'post',
    path: '/auth/logout-all',
    summary: 'Log out every active session',
    isAuth: true,
  });

  registerAuth({
    method: 'get',
    path: '/auth/sessions',
    summary: 'List active login sessions',
    isAuth: true,
  });
}

import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../../src/app';
import { User } from '../../src/app/modules/user/user.model';
import { UserRole, UserStatus } from '../../src/app/modules/user/user.constant';
import { ResetToken } from '../../src/app/modules/resetToken/resetToken.model';
import { authHeader, createRefreshToken, createTestToken } from '../helpers/auth.helper';
import { createTestUser } from '../helpers/user.helper';
import { harness } from '../harness';

describe('Auth API', () => {
  const testUserData = {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane.doe@example.com',
    password: 'Password123!',
    role: UserRole.Client,
    isEmailVerified: true,
    status: UserStatus.Active,
  };

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await User.create(testUserData);
    });

    it('returns 400 when the password is missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'jane.doe@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation Error');
      expect(res.body.errorMessages).toBeDefined();
    });

    it('returns 400 when the email format is invalid', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'not-an-email',
        password: 'Password123!',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 when the user does not exist', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'unknown@example.com',
        password: 'Password123!',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('returns 400 when the password is wrong', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: testUserData.email,
        password: 'WrongPassword999!',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('returns 407 when the email is not verified', async () => {
      await User.updateOne(
        { email: testUserData.email },
        { isEmailVerified: false },
      );

      const res = await request(app).post('/api/v1/auth/login').send({
        email: testUserData.email,
        password: testUserData.password,
      });

      expect(res.status).toBe(407);
      expect(res.body.message).toMatch(/verify your account/i);
    });

    it('returns access and refresh tokens for valid credentials', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: testUserData.email,
        password: testUserData.password,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('User logged in successfully.');
      expect(res.body.data).toMatchObject({
        role: UserRole.Client,
        email: testUserData.email,
      });
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
    });
  });

  describe('POST /api/v1/auth/change-password', () => {
    let userToken: string;

    beforeEach(async () => {
      const created = await createTestUser();
      userToken = created.token;
    });

    it('returns 401 when the request has no token', async () => {
      const res = await request(app).post('/api/v1/auth/change-password').send({
        currentPassword: 'Password123!',
        newPassword: 'NewPassword456!',
        confirmPassword: 'NewPassword456!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('changes the password and accepts the new one on login', async () => {
      const res = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', authHeader(userToken))
        .send({
          currentPassword: 'Password123!',
          newPassword: 'NewPassword456!',
          confirmPassword: 'NewPassword456!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe(
        'Your password has been successfully changed',
      );

      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: testUserData.email,
        password: 'NewPassword456!',
      });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data).toHaveProperty('accessToken');
    });
  });

  describe('password recovery', () => {
    it('sends an OTP email and verifies it', async () => {
      const { user } = await createTestUser({ isEmailVerified: false });
      harness().sendMailSpy.mockClear();

      const forgetRes = await request(app)
        .post('/api/v1/auth/forget-password')
        .send({ email: user.email });

      expect(forgetRes.status).toBe(200);
      expect(forgetRes.body.success).toBe(true);
      expect(harness().sendMailSpy).toHaveBeenCalled();

      const stored = await User.findById(user._id).select('+authentication');
      const verifyRes = await request(app).post('/api/v1/auth/verify-email').send({
        email: user.email,
        oneTimeCode: stored?.authentication?.oneTimeCode,
      });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.data).toHaveProperty('accessToken');

      const verified = await User.findById(user._id);
      expect(verified?.isEmailVerified).toBe(true);
    });

    it('resets the password with a valid reset token', async () => {
      const { user } = await createTestUser();
      await User.findByIdAndUpdate(user._id, {
        authentication: { isResetPassword: true },
      });
      const resetToken = await ResetToken.create({
        user: user._id,
        token: 'reset-token-value',
        expireAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .set('Authorization', resetToken.token)
        .send({
          newPassword: 'NewPassword456!',
          confirmPassword: 'NewPassword456!',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe(
        'Your password has been successfully reset.',
      );

      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: user.email,
        password: 'NewPassword456!',
      });
      expect(loginRes.status).toBe(200);
    });
  });

  describe('POST /api/v1/auth/refresh-token', () => {
    it('returns a new access token', async () => {
      const { user } = await createTestUser();
      const refreshToken = createRefreshToken(
        user.role,
        user._id.toString(),
        user.email,
      );

      const res = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Token refreshed successfully');
      expect(res.body.data).toHaveProperty('accessToken');
    });

    it('returns 400 when the refresh token is missing', async () => {
      const res = await request(app).post('/api/v1/auth/refresh-token').send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errorMessages).toBeDefined();
    });
  });

  it('returns 401 for an authenticated route without a token', async () => {
    const res = await request(app).get('/api/v1/users/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('accepts a bearer token created by the auth helper', async () => {
    const { token } = await createTestUser();
    const unused = createTestToken();
    expect(unused).toEqual(expect.any(String));

    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', authHeader(token));

    expect(res.status).toBe(200);
  });
});

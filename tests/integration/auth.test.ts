import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../../src/app';
import config from '../../src/config';
import { User } from '../../src/app/modules/user/user.model';
import { UserRole, UserStatus } from '../../src/app/modules/user/user.constant';
import { ResetToken } from '../../src/app/modules/resetToken/resetToken.model';
import {
  authHeader,
  createRefreshToken,
  createTestToken,
} from '../helpers/auth.helper';
import { createTestUser } from '../helpers/user.helper';
import { redis } from '../../src/config/redis';
import { initEmailWorker } from '../../src/helpers/email.worker';
import { harness } from '../harness';

// Superagent types this header as a string. Multiple Set-Cookie values arrive as an array.
const cookieHeader = (headers: { [name: string]: string }): string[] => {
  const value: unknown = headers['set-cookie'];
  if (Array.isArray(value)) {
    return value.filter(
      (cookie): cookie is string => typeof cookie === 'string',
    );
  }
  if (typeof value === 'string' && value) return [value];
  return [];
};

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

    it('returns 429 after too many login attempts', async () => {
      let lastStatus = 0;
      for (let attempt = 0; attempt < 11; attempt += 1) {
        const res = await request(app).post('/api/v1/auth/login').send({
          email: testUserData.email,
          password: 'WrongPassword999!',
        });
        lastStatus = res.status;
        if (attempt < 10) {
          expect(res.status).toBe(400);
        }
      }

      expect(lastStatus).toBe(429);
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
      });
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data.email).toBeUndefined();
      expect(res.body.data.user).toBeUndefined();
      expect(res.headers['set-cookie']).toBeUndefined();
    });
  });

  describe('browser login cookies', () => {
    const browserHeaders = () => ({
      Origin: config.frontend_url as string,
      'Sec-Fetch-Site': 'same-site',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Dest': 'empty',
    });

    beforeEach(async () => {
      await User.create(testUserData);
    });

    it('sets HttpOnly cookies and returns the user without tokens', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set(browserHeaders())
        .send({
          email: testUserData.email,
          password: testUserData.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeUndefined();
      expect(res.body.data.refreshToken).toBeUndefined();
      expect(res.body.data.email).toBeUndefined();
      expect(res.body.data.user).toBeUndefined();
      expect(res.body.data.sessionId).toEqual(expect.any(String));
      expect(res.body.data.role).toBe(UserRole.Client);

      const cookies = cookieHeader(res.headers).join('\n');
      expect(cookies).toMatch(/accessToken=[^;]+/);
      expect(cookies).toMatch(/refreshToken=[^;]+/);
      expect(cookies).toMatch(/HttpOnly/);
      expect(cookies).toMatch(/Path=\/api(;|\n|$)/);
      expect(cookies).not.toMatch(/Path=\/api\/v/);
    });

    it('logs in a browser from an unknown origin', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set({ ...browserHeaders(), Origin: 'https://evil.example' })
        .send({
          email: testUserData.email,
          password: testUserData.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(cookieHeader(res.headers).join('\n')).toMatch(/accessToken=/);
    });

    it('allows the dashboard and a localhost portal', async () => {
      const previousDashboard = config.dashboard_url;
      const previousEnv = config.node_env;
      config.dashboard_url = 'https://dashboard.controfferta.test';

      try {
        const dashboard = await request(app)
          .post('/api/v1/auth/login')
          .set({
            ...browserHeaders(),
            Origin: 'https://dashboard.controfferta.test',
          })
          .send({
            email: testUserData.email,
            password: testUserData.password,
          });
        expect(dashboard.status).toBe(200);

        config.node_env = 'development';
        const localPortal = await request(app)
          .post('/api/v1/auth/login')
          .set({ ...browserHeaders(), Origin: 'http://localhost:3999' })
          .send({
            email: testUserData.email,
            password: testUserData.password,
          });
        expect(localPortal.status).toBe(200);

        config.node_env = 'production';
        const localProduction = await request(app)
          .post('/api/v1/auth/login')
          .set({ ...browserHeaders(), Origin: 'http://localhost:3999' })
          .send({
            email: testUserData.email,
            password: testUserData.password,
          });
        expect(localProduction.status).toBe(200);
      } finally {
        config.dashboard_url = previousDashboard;
        config.node_env = previousEnv;
      }
    });

    it('uses the access cookie and refreshes from the refresh cookie', async () => {
      const login = await request(app)
        .post('/api/v1/auth/login')
        .set(browserHeaders())
        .send({
          email: testUserData.email,
          password: testUserData.password,
        });
      const pairs = cookieHeader(login.headers).map(
        cookie => cookie.split(';')[0],
      );
      const accessCookie = pairs.find(cookie =>
        cookie.startsWith('accessToken='),
      );
      const refreshCookie = pairs.find(cookie =>
        cookie.startsWith('refreshToken='),
      );

      const profile = await request(app)
        .get('/api/v1/users/me')
        .set('Cookie', accessCookie!);
      expect(profile.status).toBe(200);
      expect(profile.body.data.email).toBe(testUserData.email);

      const refreshed = await request(app)
        .post('/api/v1/auth/refresh-token')
        .set(browserHeaders())
        .set('Cookie', refreshCookie!)
        .send({});
      expect(refreshed.status).toBe(200);
      expect(refreshed.body.message).toBe('Token refreshed successfully');
      expect(refreshed.body.data.accessToken).toBeUndefined();
      expect(refreshed.body.data.refreshToken).toBeUndefined();
      expect(refreshed.body.data.sessionId).toBe(login.body.data.sessionId);
      const refreshedCookies = cookieHeader(refreshed.headers).join('\n');
      expect(refreshedCookies).toMatch(/accessToken=[^;]+/);
      expect(refreshedCookies).toMatch(/refreshToken=[^;]+/);

      const loggedOut = await request(app)
        .post('/api/v1/auth/logout')
        .set(browserHeaders())
        .set('Cookie', accessCookie!)
        .send({ sessionId: login.body.data.sessionId });
      expect(loggedOut.status).toBe(200);
      const cleared = cookieHeader(loggedOut.headers).join('\n');
      expect(cleared).toMatch(/accessToken=;/);
      expect(cleared).toMatch(/refreshToken=;/);
    });
  });

  describe('POST /api/v1/auth/change-password', () => {
    beforeEach(async () => {
      await createTestUser();
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
      const existing = await request(app).post('/api/v1/auth/login').send({
        email: testUserData.email,
        password: 'Password123!',
      });

      const res = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', authHeader(existing.body.data.accessToken))
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

      const oldRefresh = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: existing.body.data.refreshToken });
      expect(oldRefresh.status).toBe(401);

      const accessStillWorks = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', authHeader(existing.body.data.accessToken));
      expect(accessStillWorks.status).toBe(200);

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
      harness().queueAddSpy.mockClear();
      harness().workerProcessors.length = 0;

      const forgetRes = await request(app)
        .post('/api/v1/auth/forget-password')
        .send({ email: user.email });

      expect(forgetRes.status).toBe(200);
      expect(forgetRes.body.success).toBe(true);
      expect(harness().sendMailSpy).not.toHaveBeenCalled();
      expect(harness().queueAddSpy).toHaveBeenCalledWith(
        'send-email',
        expect.objectContaining({ to: user.email }),
        expect.any(Object),
      );

      initEmailWorker();
      const processor = harness().workerProcessors.at(-1);
      const queuedEmail = harness().queueAddSpy.mock.calls.at(-1)?.[1];
      await processor!({ name: 'send-email', data: queuedEmail });
      expect(harness().sendMailSpy).toHaveBeenCalled();

      const queuedHtml = String(
        harness().queueAddSpy.mock.calls.at(-1)?.[1]?.html,
      );
      const otp = Number(
        queuedHtml.match(/letter-spacing: 6px;[\s\S]*?>\s*(\d{6})/)?.[1],
      );
      const stored = await User.findById(user._id).select('+authentication');
      expect(stored?.authentication?.oneTimeCode).toMatch(/^[a-f0-9]{64}$/);
      expect(stored?.authentication?.oneTimeCode).not.toContain(String(otp));

      const verifyRes = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({
          email: user.email,
          oneTimeCode: otp,
        });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.data).toHaveProperty('accessToken');

      const verified = await User.findById(user._id);
      expect(verified?.isEmailVerified).toBe(true);
    });

    it('resets the password with a valid reset token', async () => {
      const { user } = await createTestUser();
      const existing = await request(app).post('/api/v1/auth/login').send({
        email: user.email,
        password: 'Password123!',
      });
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

      const oldRefresh = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: existing.body.data.refreshToken });
      expect(oldRefresh.status).toBe(401);

      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: user.email,
        password: 'NewPassword456!',
      });
      expect(loginRes.status).toBe(200);
    });

    it('returns one message when the account is missing, deleted, or suspended', async () => {
      const sent =
        'Please check your email. We have sent you a one-time passcode (OTP).';
      harness().queueAddSpy.mockClear();

      const missing = await request(app)
        .post('/api/v1/auth/forget-password')
        .send({ email: 'missing@example.com' });
      expect(missing.status).toBe(200);
      expect(missing.body.success).toBe(true);
      expect(missing.body.message).toBe(sent);

      await createTestUser({ email: 'deleted@example.com' });
      await User.updateOne(
        { email: 'deleted@example.com' },
        { isDeleted: true },
      );
      const deleted = await request(app)
        .post('/api/v1/auth/forget-password')
        .send({ email: 'deleted@example.com' });
      expect(deleted.status).toBe(200);
      expect(deleted.body.message).toBe(sent);

      await createTestUser({
        email: 'suspended.otp@example.com',
        status: UserStatus.Suspended,
      });
      const suspended = await request(app)
        .post('/api/v1/auth/forget-password')
        .send({ email: 'suspended.otp@example.com' });
      expect(suspended.status).toBe(200);
      expect(suspended.body.message).toBe(sent);
      expect(harness().queueAddSpy).not.toHaveBeenCalled();
    });

    it('uses the wrong-code message when the email is unknown', async () => {
      const first = await request(app).post('/api/v1/auth/verify-email').send({
        email: 'nobody@example.com',
        oneTimeCode: 123456,
      });
      expect(first.status).toBe(400);
      expect(first.body.success).toBe(false);
      expect(first.body.message).toBe('Wrong OTP, 4 attempts left');

      for (let attempt = 2; attempt <= 4; attempt += 1) {
        const wrong = await request(app)
          .post('/api/v1/auth/verify-email')
          .send({ email: 'nobody@example.com', oneTimeCode: 123456 });
        expect(wrong.status).toBe(400);
        expect(wrong.body.message).toBe(
          `Wrong OTP, ${5 - attempt} attempts left`,
        );
      }

      const locked = await request(app).post('/api/v1/auth/verify-email').send({
        email: 'nobody@example.com',
        oneTimeCode: 123456,
      });
      expect(locked.status).toBe(400);
      expect(locked.body.message).toBe(
        'Too many incorrect codes. Request a new one.',
      );
    });

    it('locks the code after five wrong attempts', async () => {
      const { user } = await createTestUser({ isEmailVerified: false });
      harness().queueAddSpy.mockClear();

      const forgetRes = await request(app)
        .post('/api/v1/auth/forget-password')
        .send({ email: user.email });
      expect(forgetRes.status).toBe(200);

      const otp = Number(
        String(harness().queueAddSpy.mock.calls.at(-1)?.[1]?.html).match(
          /letter-spacing: 6px;[\s\S]*?>\s*(\d{6})/,
        )?.[1],
      );

      for (let attempt = 1; attempt <= 4; attempt += 1) {
        const wrong = await request(app)
          .post('/api/v1/auth/verify-email')
          .send({ email: user.email, oneTimeCode: 1 });
        expect(wrong.status).toBe(400);
        expect(wrong.body.message).toBe(
          `Wrong OTP, ${5 - attempt} attempts left`,
        );
      }

      const locked = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ email: user.email, oneTimeCode: 1 });
      expect(locked.status).toBe(400);
      expect(locked.body.message).toBe(
        'Too many incorrect codes. Request a new one.',
      );

      const afterLock = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ email: user.email, oneTimeCode: otp });
      expect(afterLock.status).toBe(400);
      expect(afterLock.body.message).toBe(
        'Too many incorrect codes. Request a new one.',
      );

      const saved = await User.findById(user._id).select('+authentication');
      expect(saved?.isEmailVerified).toBe(false);
      expect(saved?.authentication?.oneTimeCode).toBeNull();
      expect(redis.expire).toHaveBeenCalledWith(
        `otp:attempts:${user._id.toString()}`,
        5 * 60,
      );
    });
  });

  describe('POST /api/v1/auth/refresh-token', () => {
    it('returns a new access token for an active login session', async () => {
      await User.create(testUserData);
      const login = await request(app).post('/api/v1/auth/login').send({
        email: testUserData.email,
        password: testUserData.password,
      });

      const res = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: login.body.data.refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Token refreshed successfully');
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data.sessionId).toBe(login.body.data.sessionId);
    });

    it('returns 400 when the account is suspended', async () => {
      const { user } = await createTestUser({
        email: 'suspended@example.com',
        status: UserStatus.Suspended,
      });
      const refreshToken = createRefreshToken(
        user.role,
        user._id.toString(),
        user.email,
      );

      const res = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/suspended/i);
    });

    it('returns 401 when the refresh token has no login session', async () => {
      const { user } = await createTestUser();
      const refreshToken = createRefreshToken(
        user.role,
        user._id.toString(),
        user.email,
      );

      const res = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe(
        'This session has ended. Please log in again.',
      );
    });

    it('returns 400 when the refresh token is missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errorMessages).toBeDefined();
    });
  });

  describe('login sessions', () => {
    const loginAs = (email: string, userAgent: string) =>
      request(app)
        .post('/api/v1/auth/login')
        .set('User-Agent', userAgent)
        .send({ email, password: 'Password123!' });

    it('lists each device and logs out only that session', async () => {
      await createTestUser();
      const phone = await loginAs('jane.doe@example.com', 'PhoneApp/1.0');
      const laptop = await loginAs('jane.doe@example.com', 'LaptopBrowser/2.0');
      expect(phone.status).toBe(200);
      expect(laptop.status).toBe(200);

      const listed = await request(app)
        .get('/api/v1/auth/sessions')
        .set('Authorization', authHeader(phone.body.data.accessToken));

      expect(listed.status).toBe(200);
      expect(listed.body.message).toBe(
        'Active sessions retrieved successfully',
      );
      expect(listed.body.data.count).toBe(2);
      expect(listed.body.data.sessions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ userAgent: 'PhoneApp/1.0' }),
          expect.objectContaining({ userAgent: 'LaptopBrowser/2.0' }),
        ]),
      );
      expect(listed.body.data.sessions[0]).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          userId: expect.any(String),
        }),
      );
      expect(listed.body.data.sessions[0]).not.toHaveProperty('tokenHash');

      const laptopSession = listed.body.data.sessions.find(
        (session: { userAgent: string }) =>
          session.userAgent === 'LaptopBrowser/2.0',
      );
      const loggedOut = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', authHeader(phone.body.data.accessToken))
        .send({ sessionId: laptopSession.id });
      expect(loggedOut.status).toBe(200);
      expect(loggedOut.body.message).toBe('Logged out successfully');

      const accessStillWorks = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', authHeader(phone.body.data.accessToken));
      expect(accessStillWorks.status).toBe(200);

      const laptopRefresh = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: laptop.body.data.refreshToken });
      expect(laptopRefresh.status).toBe(401);
      expect(laptopRefresh.body.message).toBe(
        'This session has ended. Please log in again.',
      );

      const phoneRefresh = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: phone.body.data.refreshToken });
      expect(phoneRefresh.status).toBe(200);

      const remaining = await request(app)
        .get('/api/v1/auth/sessions')
        .set('Authorization', authHeader(phone.body.data.accessToken));
      expect(remaining.body.data.count).toBe(1);
      expect(remaining.body.data.sessions[0].userAgent).toBe('PhoneApp/1.0');
    });

    it('logs out every session for the signed-in user', async () => {
      await createTestUser();
      await createTestUser({ email: 'other@example.com' });
      const phone = await loginAs('jane.doe@example.com', 'PhoneApp/1.0');
      const laptop = await loginAs('jane.doe@example.com', 'LaptopBrowser/2.0');
      const other = await loginAs('other@example.com', 'OtherPhone/1.0');

      const loggedOut = await request(app)
        .post('/api/v1/auth/logout-all')
        .set('Authorization', authHeader(phone.body.data.accessToken));
      expect(loggedOut.status).toBe(200);
      expect(loggedOut.body.message).toBe(
        'Logged out from all sessions successfully',
      );

      const phoneRefresh = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: phone.body.data.refreshToken });
      const laptopRefresh = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: laptop.body.data.refreshToken });
      expect(phoneRefresh.status).toBe(401);
      expect(laptopRefresh.status).toBe(401);

      const remaining = await request(app)
        .get('/api/v1/auth/sessions')
        .set('Authorization', authHeader(phone.body.data.accessToken));
      expect(remaining.body.data.count).toBe(0);

      const otherRefresh = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: other.body.data.refreshToken });
      expect(otherRefresh.status).toBe(200);

      const missing = await request(app).post('/api/v1/auth/logout-all');
      expect(missing.status).toBe(401);
      expect(missing.body.success).toBe(false);
    });

    it('returns 401 without a token and 400 for an empty logout body', async () => {
      const { token } = await createTestUser();

      const missing = await request(app)
        .post('/api/v1/auth/logout')
        .send({ sessionId: 'missing-session' });
      expect(missing.status).toBe(401);
      expect(missing.body.success).toBe(false);

      const badBody = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', authHeader(token))
        .send({});
      expect(badBody.status).toBe(400);
      expect(badBody.body.success).toBe(false);
      expect(badBody.body.errorMessages).toBeDefined();
    });

    it('refuses to log out another user session', async () => {
      await createTestUser();
      const other = await createTestUser({ email: 'other@example.com' });
      const jane = await loginAs('jane.doe@example.com', 'JanePhone/1.0');

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', authHeader(other.token))
        .send({ sessionId: jane.body.data.sessionId });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Session not found');
    });

    it('removes login sessions when an admin suspends or deletes the user', async () => {
      const { user } = await createTestUser();
      const { token: adminToken } = await createTestUser({
        email: 'admin@example.com',
        role: UserRole.Admin,
      });
      const jane = await loginAs('jane.doe@example.com', 'JanePhone/1.0');

      const suspended = await request(app)
        .patch(`/api/v1/users/${user._id}/status`)
        .set('Authorization', authHeader(adminToken))
        .send({ status: UserStatus.Suspended });
      expect(suspended.status).toBe(200);

      await User.findByIdAndUpdate(user._id, { status: UserStatus.Active });
      const afterSuspend = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: jane.body.data.refreshToken });
      expect(afterSuspend.status).toBe(401);

      const again = await loginAs('jane.doe@example.com', 'JanePhone/1.0');
      const deleted = await request(app)
        .delete(`/api/v1/users/${user._id}`)
        .set('Authorization', authHeader(adminToken));
      expect(deleted.status).toBe(200);

      await User.findByIdAndUpdate(user._id, { isDeleted: false });
      const afterDelete = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: again.body.data.refreshToken });
      expect(afterDelete.status).toBe(401);
      expect(afterDelete.body.message).toBe(
        'This session has ended. Please log in again.',
      );
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

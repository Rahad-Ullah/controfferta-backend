import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../../src/app';
import { User } from '../../src/app/modules/user/user.model';
import { UserRole, UserStatus } from '../../src/app/modules/user/user.constant';
import { authHeader } from '../helpers/auth.helper';
import { createTestUser } from '../helpers/user.helper';

describe('User API', () => {
  it('registers a client or a provider and rejects a staff role', async () => {
    const createdClient = await request(app).post('/api/v1/users/register').send({
      firstName: 'New',
      lastName: 'Client',
      role: UserRole.Client,
      email: 'new.client@example.com',
      password: 'Password123!',
    });

    expect(createdClient.status).toBe(200);
    expect(createdClient.body.message).toMatch(/verify your email/i);

    const savedClient = await User.findOne({ email: 'new.client@example.com' });
    expect(savedClient?.role).toBe(UserRole.Client);
    expect(savedClient?.isEmailVerified).toBe(false);

    const createdProvider = await request(app).post('/api/v1/users/register').send({
      firstName: 'New',
      lastName: 'Provider',
      role: UserRole.Provider,
      email: 'new.provider@example.com',
      password: 'Password123!',
    });

    expect(createdProvider.status).toBe(200);
    const savedProvider = await User.findOne({ email: 'new.provider@example.com' });
    expect(savedProvider?.role).toBe(UserRole.Provider);

    const rejectedAdmin = await request(app).post('/api/v1/users/register').send({
      firstName: 'Admin',
      lastName: 'Nope',
      role: UserRole.Admin,
      email: 'new.admin@example.com',
      password: 'Password123!',
    });

    expect(rejectedAdmin.status).toBe(400);
    expect(rejectedAdmin.body.success).toBe(false);
    expect(rejectedAdmin.body.errorMessages).toBeDefined();
  });

  it('lets a user read and update their profile', async () => {
    const { token } = await createTestUser();

    const profile = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', authHeader(token));

    expect(profile.status).toBe(200);
    expect(profile.body.data.email).toBe('jane.doe@example.com');

    const updated = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', authHeader(token))
      .send({ firstName: 'Janet' });

    expect(updated.status).toBe(200);
    expect(updated.body.data.firstName).toBe('Janet');
  });

  it('lets an admin change status, list, and delete users', async () => {
    const { user } = await createTestUser();
    const { token: adminToken } = await createTestUser({
      email: 'admin@example.com',
      role: UserRole.Admin,
    });
    const { token: userToken } = await createTestUser({
      email: 'other@example.com',
    });

    const forbidden = await request(app)
      .patch(`/api/v1/users/${user._id}/status`)
      .set('Authorization', authHeader(userToken))
      .send({ status: UserStatus.Suspended });
    expect(forbidden.status).toBe(403);

    const statusRes = await request(app)
      .patch(`/api/v1/users/${user._id}/status`)
      .set('Authorization', authHeader(adminToken))
      .send({ status: UserStatus.Suspended });
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.status).toBe(UserStatus.Suspended);

    const list = await request(app)
      .get('/api/v1/users/all')
      .set('Authorization', authHeader(adminToken));
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body.data)).toBe(true);

    const userList = await request(app)
      .get('/api/v1/users/all')
      .set('Authorization', authHeader(userToken));
    expect(userList.status).toBe(403);

    const deleted = await request(app)
      .delete(`/api/v1/users/${user._id}`)
      .set('Authorization', authHeader(adminToken));
    expect(deleted.status).toBe(200);

    const stored = await User.findById(user._id);
    expect(stored?.isDeleted).toBe(true);
  });
});

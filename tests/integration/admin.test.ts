import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../../src/app';
import { User } from '../../src/app/modules/user/user.model';
import { UserRole } from '../../src/app/modules/user/user.constant';
import { authHeader } from '../helpers/auth.helper';
import { createTestUser } from '../helpers/user.helper';

describe('Admin API', () => {
  it('allows only a super admin to create an admin and stores roleRef', async () => {
    const { token: userToken } = await createTestUser();
    const { token: superToken } = await createTestUser({
      email: 'super@example.com',
      role: UserRole.SuperAdmin,
    });

    const forbidden = await request(app)
      .post('/api/v1/admins/create')
      .set('Authorization', authHeader(userToken))
      .send({
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        password: 'Password123!',
      });
    expect(forbidden.status).toBe(403);

    const created = await request(app)
      .post('/api/v1/admins/create')
      .set('Authorization', authHeader(superToken))
      .send({
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        password: 'Password123!',
        permissions: ['users.read'],
      });

    expect(created.status).toBe(201);
    expect(created.body.success).toBe(true);

    const adminUser = await User.findOne({ email: 'ada@example.com' });
    expect(adminUser?.role).toBe(UserRole.Admin);
    expect(adminUser?.roleRef?.toString()).toBe(created.body.data._id);
    expect(adminUser?.firstName).toBe('Ada');
    expect(adminUser?.lastName).toBe('Lovelace');

    const updated = await request(app)
      .patch(`/api/v1/admins/${adminUser?._id}`)
      .set('Authorization', authHeader(superToken))
      .send({ permissions: ['users.read', 'users.write'] });

    expect(updated.status).toBe(200);
    expect(updated.body.data.roleRef.permissions).toEqual([
      'users.read',
      'users.write',
    ]);
  });
});

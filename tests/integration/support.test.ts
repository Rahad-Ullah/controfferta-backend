import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../../src/app';
import {
  SupportStatus,
  SupportType,
} from '../../src/app/modules/support/support.constants';
import { UserRole } from '../../src/app/modules/user/user.constant';
import { authHeader } from '../helpers/auth.helper';
import { createTestUser } from '../helpers/user.helper';

describe('Support API', () => {
  it('lets a user open a ticket and an admin update it', async () => {
    const { token } = await createTestUser();
    const { token: adminToken } = await createTestUser({
      email: 'admin@example.com',
      role: UserRole.Admin,
    });

    const created = await request(app)
      .post('/api/v1/supports/create')
      .set('Authorization', authHeader(token))
      .send({
        type: SupportType.GeneralInquiry,
        title: 'Need help',
        message: 'The login page will not load.',
      });

    expect(created.status).toBe(200);
    expect(created.body.data.status).toBe(SupportStatus.Open);

    const mine = await request(app)
      .get('/api/v1/supports/my-tickets')
      .set('Authorization', authHeader(token));
    expect(mine.status).toBe(200);
    expect(mine.body.data).toHaveLength(1);

    const forbidden = await request(app)
      .get('/api/v1/supports')
      .set('Authorization', authHeader(token));
    expect(forbidden.status).toBe(403);

    const updated = await request(app)
      .patch(`/api/v1/supports/${created.body.data._id}`)
      .set('Authorization', authHeader(adminToken))
      .send({ status: SupportStatus.Resolved });
    expect(updated.status).toBe(200);
    expect(updated.body.data.status).toBe(SupportStatus.Resolved);

    const all = await request(app)
      .get('/api/v1/supports')
      .set('Authorization', authHeader(adminToken));
    expect(all.status).toBe(200);
    expect(all.body.data).toHaveLength(1);
  });
});

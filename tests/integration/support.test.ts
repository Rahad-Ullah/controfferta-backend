import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../../src/app';
import {
  SupportPriority,
  SupportStatus,
} from '../../src/app/modules/support/support.constants';
import { UserRole } from '../../src/app/modules/user/user.constant';
import { authHeader } from '../helpers/auth.helper';
import { createTestUser } from '../helpers/user.helper';

describe('Support API', () => {
  it('stores a public message for an admin to handle', async () => {
    const { token: clientToken } = await createTestUser({
      email: 'client@example.com',
      role: UserRole.Client,
    });
    const { token: adminToken } = await createTestUser({
      email: 'admin@example.com',
      role: UserRole.Admin,
    });

    const invalid = await request(app).post('/api/v1/supports/create').send({
      firstName: 'Luca',
      lastName: 'Rossi',
      email: 'not-an-email',
      subject: 'Billing question',
      message: 'I was charged twice.',
    });
    expect(invalid.status).toBe(400);
    expect(invalid.body.success).toBe(false);

    const created = await request(app).post('/api/v1/supports/create').send({
      firstName: 'Luca',
      lastName: 'Rossi',
      email: 'luca@example.com',
      subject: 'Billing question',
      message: 'I was charged twice.',
    });
    expect(created.status).toBe(201);
    expect(created.body.message).toBe('Support message sent successfully');
    expect(created.body.data.status).toBe(SupportStatus.Open);
    expect(created.body.data.priority).toBe(SupportPriority.Medium);
    expect(created.body.data.email).toBe('luca@example.com');
    const supportId = created.body.data._id;

    const noToken = await request(app).get(`/api/v1/supports/${supportId}`);
    expect(noToken.status).toBe(401);

    const clientList = await request(app)
      .get('/api/v1/supports/all')
      .set('Authorization', authHeader(clientToken));
    expect(clientList.status).toBe(403);

    const clientUpdate = await request(app)
      .patch(`/api/v1/supports/${supportId}`)
      .set('Authorization', authHeader(clientToken))
      .send({ status: SupportStatus.Closed });
    expect(clientUpdate.status).toBe(403);

    const updated = await request(app)
      .patch(`/api/v1/supports/${supportId}`)
      .set('Authorization', authHeader(adminToken))
      .send({
        status: SupportStatus.InProgress,
        priority: SupportPriority.High,
      });
    expect(updated.status).toBe(200);
    expect(updated.body.message).toBe('Support message updated successfully');
    expect(updated.body.data.status).toBe(SupportStatus.InProgress);
    expect(updated.body.data.priority).toBe(SupportPriority.High);

    const list = await request(app)
      .get('/api/v1/supports/all')
      .query({ searchTerm: 'Billing', status: SupportStatus.InProgress })
      .set('Authorization', authHeader(adminToken));
    expect(list.status).toBe(200);
    expect(list.body.message).toBe('Support messages fetched successfully');
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].email).toBe('luca@example.com');

    const one = await request(app)
      .get(`/api/v1/supports/${supportId}`)
      .set('Authorization', authHeader(adminToken));
    expect(one.status).toBe(200);
    expect(one.body.data.subject).toBe('Billing question');

    const deleted = await request(app)
      .delete(`/api/v1/supports/${supportId}`)
      .set('Authorization', authHeader(adminToken));
    expect(deleted.status).toBe(200);
    expect(deleted.body.data.isDeleted).toBe(true);

    const gone = await request(app)
      .get(`/api/v1/supports/${supportId}`)
      .set('Authorization', authHeader(adminToken));
    expect(gone.status).toBe(404);
    expect(gone.body.message).toBe('Support message not found');

    const empty = await request(app)
      .get('/api/v1/supports/all')
      .set('Authorization', authHeader(adminToken));
    expect(empty.body.data).toEqual([]);
  });
});

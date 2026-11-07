import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../../src/app';
import { Category } from '../../src/app/modules/category/category.model';
import { UserRole } from '../../src/app/modules/user/user.constant';
import { authHeader } from '../helpers/auth.helper';
import { createTestUser } from '../helpers/user.helper';

const categoryBody = {
  name: 'Solar',
  description: 'Photovoltaic installation',
  creditCost: 12,
};

describe('Category API', () => {
  it('lets an admin manage categories and hides a deleted one', async () => {
    const { token: userToken } = await createTestUser({
      email: 'provider@example.com',
      role: UserRole.Provider,
    });
    const { token: adminToken } = await createTestUser({
      email: 'admin@example.com',
      role: UserRole.Admin,
    });

    const publicList = await request(app).get('/api/v1/categories');
    expect(publicList.status).toBe(200);
    expect(publicList.body.data).toEqual([]);

    const missingToken = await request(app)
      .post('/api/v1/categories/create')
      .send(categoryBody);
    expect(missingToken.status).toBe(401);

    const forbidden = await request(app)
      .post('/api/v1/categories/create')
      .set('Authorization', authHeader(userToken))
      .send(categoryBody);
    expect(forbidden.status).toBe(403);

    const invalidCost = await request(app)
      .post('/api/v1/categories/create')
      .set('Authorization', authHeader(adminToken))
      .send({ ...categoryBody, creditCost: 1.5 });
    expect(invalidCost.status).toBe(400);
    expect(invalidCost.body.success).toBe(false);
    expect(invalidCost.body.errorMessages).toBeDefined();

    const created = await request(app)
      .post('/api/v1/categories/create')
      .set('Authorization', authHeader(adminToken))
      .send(categoryBody);
    expect(created.status).toBe(201);
    expect(created.body.message).toBe('Category created successfully');
    expect(created.body.data.creditCost).toBe(12);

    const duplicate = await request(app)
      .post('/api/v1/categories/create')
      .set('Authorization', authHeader(adminToken))
      .send({ ...categoryBody, name: 'solar' });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.message).toBe('Category already exists');

    const one = await request(app).get(
      `/api/v1/categories/${created.body.data._id}`,
    );
    expect(one.status).toBe(200);
    expect(one.body.data.name).toBe('Solar');

    const listed = await request(app).get('/api/v1/categories?searchTerm=sol');
    expect(listed.status).toBe(200);
    expect(listed.body.data).toHaveLength(1);
    expect(listed.body.pagination.total).toBe(1);

    const updated = await request(app)
      .patch(`/api/v1/categories/${created.body.data._id}`)
      .set('Authorization', authHeader(adminToken))
      .send({ creditCost: 20 });
    expect(updated.status).toBe(200);
    expect(updated.body.data.creditCost).toBe(20);

    const userDelete = await request(app)
      .delete(`/api/v1/categories/${created.body.data._id}`)
      .set('Authorization', authHeader(userToken));
    expect(userDelete.status).toBe(403);

    const deleted = await request(app)
      .delete(`/api/v1/categories/${created.body.data._id}`)
      .set('Authorization', authHeader(adminToken));
    expect(deleted.status).toBe(200);

    const stored = await Category.findById(created.body.data._id);
    expect(stored?.isDeleted).toBe(true);

    const hidden = await request(app).get(
      `/api/v1/categories/${created.body.data._id}`,
    );
    expect(hidden.status).toBe(404);
    expect(hidden.body.message).toBe('Category not found');

    const reused = await request(app)
      .post('/api/v1/categories/create')
      .set('Authorization', authHeader(adminToken))
      .send(categoryBody);
    expect(reused.status).toBe(201);
  });
});

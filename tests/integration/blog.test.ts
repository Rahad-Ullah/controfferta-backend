import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../../src/app';
import { BlogStatus } from '../../src/app/modules/blog/blog.constant';
import { Blog } from '../../src/app/modules/blog/blog.model';
import { Category } from '../../src/app/modules/category/category.model';
import { UserRole } from '../../src/app/modules/user/user.constant';
import { authHeader } from '../helpers/auth.helper';
import { createTestUser } from '../helpers/user.helper';

describe('Blog API', () => {
  it('keeps a post hidden until an admin publishes it', async () => {
    const category = await Category.create({
      name: 'Solar',
      description: 'Photovoltaic installation',
      creditCost: 12,
    });
    const { token: adminToken } = await createTestUser({
      email: 'admin@example.com',
      role: UserRole.Admin,
    });
    const { token: clientToken } = await createTestUser({
      email: 'client@example.com',
      role: UserRole.Client,
    });

    const post = {
      category: category._id.toString(),
      title: 'How to size a home solar system',
      description: 'A short guide for detached houses',
      bodyContent: 'Start from the yearly electricity bill.',
      imageUrl: 'https://example.com/solar.jpg',
    };

    const noToken = await request(app).post('/api/v1/blogs/create').send(post);
    expect(noToken.status).toBe(401);

    const forbidden = await request(app)
      .post('/api/v1/blogs/create')
      .set('Authorization', authHeader(clientToken))
      .send(post);
    expect(forbidden.status).toBe(403);

    const missingCategory = await request(app)
      .post('/api/v1/blogs/create')
      .set('Authorization', authHeader(adminToken))
      .send({ ...post, category: '665f1234567890abcdef1234' });
    expect(missingCategory.status).toBe(404);
    expect(missingCategory.body.message).toBe('Category not found');

    const created = await request(app)
      .post('/api/v1/blogs/create')
      .set('Authorization', authHeader(adminToken))
      .send(post);
    expect(created.status).toBe(201);
    expect(created.body.message).toBe('Blog created successfully');
    expect(created.body.data.status).toBe(BlogStatus.Pending);
    expect(created.body.data.author.firstName).toBe('Jane');
    expect(created.body.data.author.email).toBeUndefined();
    expect(created.body.data.category.name).toBe('Solar');
    const blogId = created.body.data._id;

    const hiddenList = await request(app).get('/api/v1/blogs');
    expect(hiddenList.status).toBe(200);
    expect(hiddenList.body.data).toEqual([]);

    const hiddenOne = await request(app).get(`/api/v1/blogs/${blogId}`);
    expect(hiddenOne.status).toBe(404);
    expect(hiddenOne.body.message).toBe('Blog not found');

    const clientAll = await request(app)
      .get('/api/v1/blogs/all')
      .set('Authorization', authHeader(clientToken));
    expect(clientAll.status).toBe(403);

    const updated = await request(app)
      .patch(`/api/v1/blogs/${blogId}`)
      .set('Authorization', authHeader(adminToken))
      .send({ title: 'How to size a rooftop solar system' });
    expect(updated.status).toBe(200);
    expect(updated.body.message).toBe('Blog updated successfully');
    expect(updated.body.data.title).toBe('How to size a rooftop solar system');

    const published = await request(app)
      .patch(`/api/v1/blogs/${blogId}/status`)
      .set('Authorization', authHeader(adminToken))
      .send({ status: BlogStatus.Published });
    expect(published.status).toBe(200);
    expect(published.body.message).toBe('Blog status updated successfully');

    const publicList = await request(app).get(
      `/api/v1/blogs?searchTerm=rooftop&category=${category._id}`,
    );
    expect(publicList.status).toBe(200);
    expect(publicList.body.data).toHaveLength(1);
    expect(publicList.body.data[0].author.email).toBeUndefined();

    const publicOne = await request(app).get(`/api/v1/blogs/${blogId}`);
    expect(publicOne.status).toBe(200);
    expect(publicOne.body.data.bodyContent).toMatch(/electricity bill/);

    const adminList = await request(app)
      .get(`/api/v1/blogs/all?status=${BlogStatus.Published}`)
      .set('Authorization', authHeader(adminToken));
    expect(adminList.status).toBe(200);
    expect(adminList.body.data).toHaveLength(1);

    const hidden = await request(app)
      .patch(`/api/v1/blogs/${blogId}/status`)
      .set('Authorization', authHeader(adminToken))
      .send({ status: BlogStatus.Hidden });
    expect(hidden.status).toBe(200);

    const afterHide = await request(app).get('/api/v1/blogs');
    expect(afterHide.body.data).toEqual([]);

    const deleted = await request(app)
      .delete(`/api/v1/blogs/${blogId}`)
      .set('Authorization', authHeader(adminToken));
    expect(deleted.status).toBe(200);
    expect(deleted.body.message).toBe('Blog deleted successfully');

    const stored = await Blog.findById(blogId);
    expect(stored?.isDeleted).toBe(true);

    const afterDelete = await request(app).get(`/api/v1/blogs/${blogId}`);
    expect(afterDelete.status).toBe(404);
  });
});

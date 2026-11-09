import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../../src/app';
import { PlatformReviewStatus } from '../../src/app/modules/platformReview/platformReview.constant';
import { PlatformReview } from '../../src/app/modules/platformReview/platformReview.model';
import { UserRole } from '../../src/app/modules/user/user.constant';
import { authHeader } from '../helpers/auth.helper';
import { createTestUser } from '../helpers/user.helper';

describe('Platform review API', () => {
  it('keeps a review hidden until an admin publishes it', async () => {
    const { token: clientToken } = await createTestUser({
      email: 'client@example.com',
      role: UserRole.Client,
    });
    const { token: otherToken } = await createTestUser({
      email: 'other@example.com',
      role: UserRole.Client,
    });
    const { token: providerToken } = await createTestUser({
      email: 'provider@example.com',
      role: UserRole.Provider,
    });
    const { token: adminToken } = await createTestUser({
      email: 'admin@example.com',
      role: UserRole.Admin,
    });

    const noToken = await request(app)
      .post('/api/v1/platform-reviews/create')
      .send({ rating: 5, message: 'Clear and fast' });
    expect(noToken.status).toBe(401);

    const staff = await request(app)
      .post('/api/v1/platform-reviews/create')
      .set('Authorization', authHeader(adminToken))
      .send({ rating: 5, message: 'Clear and fast' });
    expect(staff.status).toBe(403);

    const invalid = await request(app)
      .post('/api/v1/platform-reviews/create')
      .set('Authorization', authHeader(clientToken))
      .send({ rating: 6, message: 'Too high' });
    expect(invalid.status).toBe(400);
    expect(invalid.body.success).toBe(false);

    const created = await request(app)
      .post('/api/v1/platform-reviews/create')
      .set('Authorization', authHeader(clientToken))
      .send({ rating: 5, message: 'Clear and fast' });
    expect(created.status).toBe(201);
    expect(created.body.message).toBe('Platform review submitted successfully');
    expect(created.body.data.status).toBe(PlatformReviewStatus.Pending);
    expect(created.body.data.rating).toBe(5);
    expect(created.body.data.user.firstName).toBe('Jane');
    expect(created.body.data.user.email).toBeUndefined();
    const reviewId = created.body.data._id;

    const hiddenList = await request(app).get('/api/v1/platform-reviews');
    expect(hiddenList.status).toBe(200);
    expect(hiddenList.body.data).toEqual([]);

    const hiddenOne = await request(app).get(
      `/api/v1/platform-reviews/${reviewId}`,
    );
    expect(hiddenOne.status).toBe(404);
    expect(hiddenOne.body.message).toBe('Platform review not found');

    const mine = await request(app)
      .get('/api/v1/platform-reviews/me')
      .set('Authorization', authHeader(clientToken));
    expect(mine.status).toBe(200);
    expect(mine.body.data).toHaveLength(1);

    const otherMine = await request(app)
      .get('/api/v1/platform-reviews/me')
      .set('Authorization', authHeader(otherToken));
    expect(otherMine.body.data).toEqual([]);

    const providerAll = await request(app)
      .get('/api/v1/platform-reviews/all')
      .set('Authorization', authHeader(providerToken));
    expect(providerAll.status).toBe(403);

    const published = await request(app)
      .patch(`/api/v1/platform-reviews/${reviewId}/status`)
      .set('Authorization', authHeader(adminToken))
      .send({ status: PlatformReviewStatus.Published });
    expect(published.status).toBe(200);
    expect(published.body.message).toBe(
      'Platform review status updated successfully',
    );

    const publicList = await request(app).get(
      '/api/v1/platform-reviews?searchTerm=fast',
    );
    expect(publicList.status).toBe(200);
    expect(publicList.body.data).toHaveLength(1);
    expect(publicList.body.data[0].user.email).toBeUndefined();

    const publicOne = await request(app).get(
      `/api/v1/platform-reviews/${reviewId}`,
    );
    expect(publicOne.status).toBe(200);
    expect(publicOne.body.data.message).toBe('Clear and fast');

    const providerReview = await request(app)
      .post('/api/v1/platform-reviews/create')
      .set('Authorization', authHeader(providerToken))
      .send({ rating: 4, message: 'Useful leads' });
    expect(providerReview.status).toBe(201);
    expect(providerReview.body.data.status).toBe(PlatformReviewStatus.Pending);

    const adminList = await request(app)
      .get('/api/v1/platform-reviews/all')
      .set('Authorization', authHeader(adminToken));
    expect(adminList.status).toBe(200);
    expect(adminList.body.data).toHaveLength(2);

    const stillPublic = await request(app).get('/api/v1/platform-reviews');
    expect(stillPublic.body.data).toHaveLength(1);

    const hidden = await request(app)
      .patch(`/api/v1/platform-reviews/${reviewId}/status`)
      .set('Authorization', authHeader(adminToken))
      .send({ status: PlatformReviewStatus.Hidden });
    expect(hidden.status).toBe(200);

    const afterHide = await request(app).get('/api/v1/platform-reviews');
    expect(afterHide.body.data).toEqual([]);

    const deleted = await request(app)
      .delete(`/api/v1/platform-reviews/${reviewId}`)
      .set('Authorization', authHeader(adminToken));
    expect(deleted.status).toBe(200);
    expect(deleted.body.message).toBe('Platform review deleted successfully');

    const stored = await PlatformReview.findById(reviewId);
    expect(stored?.isDeleted).toBe(true);

    const afterDelete = await request(app).get(
      `/api/v1/platform-reviews/${reviewId}`,
    );
    expect(afterDelete.status).toBe(404);

    const mineAfter = await request(app)
      .get('/api/v1/platform-reviews/me')
      .set('Authorization', authHeader(clientToken));
    expect(mineAfter.body.data).toEqual([]);
  });
});

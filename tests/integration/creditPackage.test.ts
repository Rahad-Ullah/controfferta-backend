import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../../src/app';
import { CreditPackageStatus } from '../../src/app/modules/creditPackage/creditPackage.constant';
import { UserRole } from '../../src/app/modules/user/user.constant';
import { authHeader } from '../helpers/auth.helper';
import { harness } from '../harness';
import { createTestUser } from '../helpers/user.helper';

describe('Credit package API', () => {
  it('sells an active package and hides it after an admin deletes it', async () => {
    harness().stripeMock.products.create.mockClear();
    harness().stripeMock.prices.create.mockClear();
    harness().stripeMock.prices.update.mockClear();
    harness()
      .stripeMock.prices.create.mockImplementationOnce(() =>
        Promise.resolve({ id: 'price_test_mock1' }),
      )
      .mockImplementationOnce(() =>
        Promise.resolve({ id: 'price_test_mock2' }),
      );

    const { token: adminToken } = await createTestUser({
      email: 'admin@example.com',
      role: UserRole.Admin,
    });
    const { token: clientToken } = await createTestUser({
      email: 'client@example.com',
      role: UserRole.Client,
    });

    const noToken = await request(app)
      .post('/api/v1/credit-packages/create')
      .send({
        name: 'Starter',
        description: '100 credits',
        creditsAmount: 100,
        price: 4900,
      });
    expect(noToken.status).toBe(401);

    const forbidden = await request(app)
      .post('/api/v1/credit-packages/create')
      .set('Authorization', authHeader(clientToken))
      .send({
        name: 'Starter',
        description: '100 credits',
        creditsAmount: 100,
        price: 4900,
      });
    expect(forbidden.status).toBe(403);

    const cheap = await request(app)
      .post('/api/v1/credit-packages/create')
      .set('Authorization', authHeader(adminToken))
      .send({
        name: 'Starter',
        description: '100 credits',
        creditsAmount: 100,
        price: 10,
      });
    expect(cheap.status).toBe(400);
    expect(cheap.body.success).toBe(false);

    const created = await request(app)
      .post('/api/v1/credit-packages/create')
      .set('Authorization', authHeader(adminToken))
      .send({
        name: 'Starter',
        description: '100 credits for one lead',
        creditsAmount: 100,
        price: 4900,
        tag: 'popular',
      });
    expect(created.status).toBe(201);
    expect(created.body.message).toBe('Credit package created successfully');
    expect(created.body.data.stripeProductId).toBe('prod_test_mock123');
    expect(created.body.data.stripePriceId).toBe('price_test_mock1');
    expect(created.body.data.purchaseCount).toBe(0);
    expect(harness().stripeMock.products.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Starter' }),
    );
    expect(harness().stripeMock.prices.create).toHaveBeenCalledWith(
      expect.objectContaining({ currency: 'eur', unit_amount: 4900 }),
    );

    const packageId = created.body.data._id;

    const catalog = await request(app).get(
      '/api/v1/credit-packages?searchTerm=Starter',
    );
    expect(catalog.status).toBe(200);
    expect(catalog.body.data).toHaveLength(1);
    expect(catalog.body.data[0].price).toBe(4900);

    const repriced = await request(app)
      .patch(`/api/v1/credit-packages/${packageId}`)
      .set('Authorization', authHeader(adminToken))
      .send({ price: 9900 });
    expect(repriced.status).toBe(200);
    expect(repriced.body.data.price).toBe(9900);
    expect(repriced.body.data.stripePriceId).toBe('price_test_mock2');
    expect(harness().stripeMock.prices.update).toHaveBeenCalledWith(
      'price_test_mock1',
      { active: false },
    );

    const hidden = await request(app)
      .patch(`/api/v1/credit-packages/${packageId}`)
      .set('Authorization', authHeader(adminToken))
      .send({ status: CreditPackageStatus.Inactive });
    expect(hidden.status).toBe(200);

    const publicList = await request(app).get('/api/v1/credit-packages');
    expect(publicList.body.data).toEqual([]);

    const adminList = await request(app)
      .get('/api/v1/credit-packages/all')
      .set('Authorization', authHeader(adminToken));
    expect(adminList.status).toBe(200);
    expect(adminList.body.data).toHaveLength(1);

    const clientList = await request(app)
      .get('/api/v1/credit-packages/all')
      .set('Authorization', authHeader(clientToken));
    expect(clientList.status).toBe(403);

    const removed = await request(app)
      .delete(`/api/v1/credit-packages/${packageId}`)
      .set('Authorization', authHeader(adminToken));
    expect(removed.status).toBe(200);
    expect(removed.body.message).toBe('Credit package deleted successfully');
    expect(removed.body.data.isDeleted).toBe(true);

    const gone = await request(app).get(`/api/v1/credit-packages/${packageId}`);
    expect(gone.status).toBe(404);
    expect(gone.body.message).toBe('Credit package not found');
  });
});

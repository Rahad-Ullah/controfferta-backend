import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../../src/app';
import { Category } from '../../src/app/modules/category/category.model';
import { LeadStatus } from '../../src/app/modules/lead/lead.constant';
import { Lead } from '../../src/app/modules/lead/lead.model';
import { UserRole } from '../../src/app/modules/user/user.constant';
import { authHeader } from '../helpers/auth.helper';
import { createTestUser } from '../helpers/user.helper';

describe('Lead API', () => {
  it('submits a lead without an account and publishes it to providers', async () => {
    const category = await Category.create({
      name: 'Solar',
      description: 'Photovoltaic installation',
      creditCost: 12,
    });
    const { token: providerToken } = await createTestUser({
      email: 'provider@example.com',
      role: UserRole.Provider,
    });
    const { token: clientToken } = await createTestUser({
      email: 'client@example.com',
      role: UserRole.Client,
    });
    const { token: adminToken } = await createTestUser({
      email: 'admin@example.com',
      role: UserRole.Admin,
    });

    const body = {
      category: category._id.toString(),
      title: 'Roof solar installation',
      description: 'A 6kW system for a detached house',
      address: 'Via Roma 10, Milano',
      budgetRange: { minimum: 4000, maximum: 8000 },
      timeline: 'Within 3 months',
      client: {
        name: 'Mario Rossi',
        email: 'mario@example.com',
        phone: { countryCode: '+39', number: '3331234567' },
        address: 'Via Verdi 2, Milano',
      },
    };

    const missingCategory = await request(app)
      .post('/api/v1/leads/create')
      .send({ ...body, category: '665f1234567890abcdef1234' });
    expect(missingCategory.status).toBe(404);
    expect(missingCategory.body.message).toBe('Category not found');

    const invalidBudget = await request(app)
      .post('/api/v1/leads/create')
      .send({
        ...body,
        budgetRange: { minimum: 9000, maximum: 1000 },
      });
    expect(invalidBudget.status).toBe(400);
    expect(invalidBudget.body.success).toBe(false);

    const created = await request(app).post('/api/v1/leads/create').send(body);
    expect(created.status).toBe(201);
    expect(created.body.message).toBe('Lead submitted successfully');
    expect(created.body.data.status).toBe(LeadStatus.Pending);
    expect(created.body.data.uid).toMatch(/^LED-/);
    expect(created.body.data.client.email).toBe('mario@example.com');

    const leadId = created.body.data._id;

    const noToken = await request(app).get('/api/v1/leads');
    expect(noToken.status).toBe(200);
    expect(noToken.body.data).toEqual([]);

    const clientFeed = await request(app)
      .get('/api/v1/leads')
      .set('Authorization', authHeader(clientToken));
    expect(clientFeed.status).toBe(200);
    expect(clientFeed.body.data).toEqual([]);

    const hiddenFeed = await request(app)
      .get('/api/v1/leads?searchTerm=Milano')
      .set('Authorization', authHeader(providerToken));
    expect(hiddenFeed.status).toBe(200);
    expect(hiddenFeed.body.data).toEqual([]);

    const hiddenOne = await request(app)
      .get(`/api/v1/leads/${leadId}`)
      .set('Authorization', authHeader(providerToken));
    expect(hiddenOne.status).toBe(404);

    const illegalClose = await request(app)
      .patch(`/api/v1/leads/${leadId}/status`)
      .set('Authorization', authHeader(adminToken))
      .send({ status: LeadStatus.Closed });
    expect(illegalClose.status).toBe(400);
    expect(illegalClose.body.message).toBe('This status change is not allowed');

    const accepted = await request(app)
      .patch(`/api/v1/leads/${leadId}/status`)
      .set('Authorization', authHeader(adminToken))
      .send({ status: LeadStatus.Accepted });
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.status).toBe(LeadStatus.Accepted);

    const feed = await request(app)
      .get(`/api/v1/leads?searchTerm=${encodeURIComponent('Via Roma')}`)
      .set('Authorization', authHeader(providerToken));
    expect(feed.status).toBe(200);
    expect(feed.body.data).toHaveLength(1);
    expect(feed.body.data[0].client).toBeUndefined();
    expect(feed.body.data[0].category.creditCost).toBe(12);
    expect(feed.body.data[0].description).toMatch(/6kW/);

    const providerView = await request(app)
      .get(`/api/v1/leads/${leadId}`)
      .set('Authorization', authHeader(providerToken));
    expect(providerView.status).toBe(200);
    expect(providerView.body.data.client).toBeUndefined();

    const adminView = await request(app)
      .get(`/api/v1/leads/${leadId}`)
      .set('Authorization', authHeader(adminToken));
    expect(adminView.body.data.client.phone.number).toBe('3331234567');

    const adminList = await request(app)
      .get('/api/v1/leads/all')
      .set('Authorization', authHeader(adminToken));
    expect(adminList.status).toBe(200);
    expect(adminList.body.data[0].client.email).toBe('mario@example.com');

    const providerList = await request(app)
      .get('/api/v1/leads/all')
      .set('Authorization', authHeader(providerToken));
    expect(providerList.status).toBe(403);

    const deleted = await request(app)
      .delete(`/api/v1/leads/${leadId}`)
      .set('Authorization', authHeader(adminToken));
    expect(deleted.status).toBe(200);

    const stored = await Lead.findById(leadId);
    expect(stored?.isDeleted).toBe(true);
    expect(stored?.status).toBe(LeadStatus.Accepted);

    const afterDelete = await request(app)
      .get('/api/v1/leads')
      .set('Authorization', authHeader(providerToken));
    expect(afterDelete.body.data).toEqual([]);
  });
});

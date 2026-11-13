import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../../src/app';
import { Category } from '../../src/app/modules/category/category.model';
import {
  CreditLedgerReferenceType,
  CreditLedgerType,
} from '../../src/app/modules/creditLedger/creditLedger.constant';
import { CreditLedger } from '../../src/app/modules/creditLedger/creditLedger.model';
import { LeadAccessStatus } from '../../src/app/modules/leadAccess/leadAccess.constant';
import { LeadAccess } from '../../src/app/modules/leadAccess/leadAccess.model';
import { LeadStatus } from '../../src/app/modules/lead/lead.constant';
import { Provider } from '../../src/app/modules/provider/provider.model';
import { BusinessType } from '../../src/app/modules/provider/provider.constant';
import { User } from '../../src/app/modules/user/user.model';
import { UserRole } from '../../src/app/modules/user/user.constant';
import { authHeader } from '../helpers/auth.helper';
import { createTestUser } from '../helpers/user.helper';

describe('Lead access API', () => {
  it('unlocks an accepted lead and spends the category credit cost', async () => {
    const category = await Category.create({
      name: 'Solar',
      description: 'Photovoltaic installation',
      creditCost: 12,
    });
    const { token: adminToken } = await createTestUser({
      email: 'admin@example.com',
      role: UserRole.Admin,
    });
    const { user, token: providerToken } = await createTestUser({
      email: 'provider@example.com',
      role: UserRole.Provider,
    });
    const { user: otherUser, token: otherToken } = await createTestUser({
      email: 'other@example.com',
      role: UserRole.Provider,
    });
    const { token: clientToken } = await createTestUser({
      email: 'client@example.com',
      role: UserRole.Client,
    });
    const { token: noProfileToken } = await createTestUser({
      email: 'noprofile@example.com',
      role: UserRole.Provider,
    });

    const provider = await Provider.create({
      user: user._id,
      businessName: 'Acme Solar',
      businessType: BusinessType.Company,
    });
    await User.updateOne({ _id: user._id }, { roleRef: provider._id });
    const otherProvider = await Provider.create({
      user: otherUser._id,
      businessName: 'Other Co',
      businessType: BusinessType.Company,
    });
    await User.updateOne(
      { _id: otherUser._id },
      { roleRef: otherProvider._id },
    );

    const created = await request(app).post('/api/v1/leads/create').send({
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
    });
    expect(created.status).toBe(201);
    const leadId = created.body.data._id;

    const noToken = await request(app)
      .post('/api/v1/lead-accesses/unlock')
      .send({ lead: leadId });
    expect(noToken.status).toBe(401);

    const forbidden = await request(app)
      .post('/api/v1/lead-accesses/unlock')
      .set('Authorization', authHeader(clientToken))
      .send({ lead: leadId });
    expect(forbidden.status).toBe(403);

    const noProfile = await request(app)
      .post('/api/v1/lead-accesses/unlock')
      .set('Authorization', authHeader(noProfileToken))
      .send({ lead: leadId });
    expect(noProfile.status).toBe(404);
    expect(noProfile.body.message).toBe('Provider profile not found');

    const pending = await request(app)
      .post('/api/v1/lead-accesses/unlock')
      .set('Authorization', authHeader(providerToken))
      .send({ lead: leadId });
    expect(pending.status).toBe(400);
    expect(pending.body.message).toBe('This lead is not available');

    const missing = await request(app)
      .post('/api/v1/lead-accesses/unlock')
      .set('Authorization', authHeader(providerToken))
      .send({ lead: '665f1234567890abcdef1234' });
    expect(missing.status).toBe(404);
    expect(missing.body.message).toBe('Lead not found');

    await request(app)
      .patch(`/api/v1/leads/${leadId}/status`)
      .set('Authorization', authHeader(adminToken))
      .send({ status: LeadStatus.Accepted });

    const broke = await request(app)
      .post('/api/v1/lead-accesses/unlock')
      .set('Authorization', authHeader(providerToken))
      .send({ lead: leadId });
    expect(broke.status).toBe(400);
    expect(broke.body.message).toBe('Not enough credits');
    expect(await LeadAccess.countDocuments()).toBe(0);

    const funded = await request(app)
      .post('/api/v1/credit-ledgers/adjust')
      .set('Authorization', authHeader(adminToken))
      .send({
        provider: provider._id.toString(),
        amount: 20,
        note: 'Opening balance',
      });
    expect(funded.status).toBe(201);

    const unlocked = await request(app)
      .post('/api/v1/lead-accesses/unlock')
      .set('Authorization', authHeader(providerToken))
      .send({ lead: leadId });
    expect(unlocked.status).toBe(201);
    expect(unlocked.body.message).toBe('Lead unlocked successfully');
    expect(unlocked.body.data.status).toBe(LeadAccessStatus.Unlocked);
    expect(unlocked.body.data.creditCost).toBe(12);
    expect(unlocked.body.data.lead.client.email).toBe('mario@example.com');
    const accessId = unlocked.body.data._id;

    const balance = await Provider.findById(provider._id);
    expect(balance?.creditBalance).toBe(8);
    const spent = await CreditLedger.findOne({
      provider: provider._id,
      type: CreditLedgerType.Unlock,
    });
    expect(spent?.amount).toBe(-12);
    expect(spent?.balanceAfter).toBe(8);
    expect(spent?.reference?.type).toBe(CreditLedgerReferenceType.LeadAccess);
    expect(spent?.reference?.id.toString()).toBe(accessId);

    const feed = await request(app)
      .get('/api/v1/leads')
      .set('Authorization', authHeader(providerToken));
    expect(feed.status).toBe(200);
    expect(feed.body.data[0].client).toBeUndefined();

    const again = await request(app)
      .post('/api/v1/lead-accesses/unlock')
      .set('Authorization', authHeader(providerToken))
      .send({ lead: leadId });
    expect(again.status).toBe(409);
    expect(again.body.message).toBe('Lead already unlocked');

    const hidden = await request(app)
      .get(`/api/v1/lead-accesses/${accessId}`)
      .set('Authorization', authHeader(otherToken));
    expect(hidden.status).toBe(404);
    expect(hidden.body.message).toBe('Lead access not found');

    const mine = await request(app)
      .get(`/api/v1/lead-accesses/${accessId}`)
      .set('Authorization', authHeader(providerToken));
    expect(mine.status).toBe(200);
    expect(mine.body.data.lead.client.phone.number).toBe('3331234567');

    const skipped = await request(app)
      .patch(`/api/v1/lead-accesses/${accessId}/status`)
      .set('Authorization', authHeader(providerToken))
      .send({ status: LeadAccessStatus.Completed });
    expect(skipped.status).toBe(400);
    expect(skipped.body.message).toBe('This status change is not allowed');

    const contacted = await request(app)
      .patch(`/api/v1/lead-accesses/${accessId}/status`)
      .set('Authorization', authHeader(providerToken))
      .send({ status: LeadAccessStatus.Contacted });
    expect(contacted.status).toBe(200);
    expect(contacted.body.data.status).toBe(LeadAccessStatus.Contacted);

    const started = await request(app)
      .patch(`/api/v1/lead-accesses/${accessId}/status`)
      .set('Authorization', authHeader(providerToken))
      .send({ status: LeadAccessStatus.InProgress });
    expect(started.status).toBe(200);

    const done = await request(app)
      .patch(`/api/v1/lead-accesses/${accessId}/status`)
      .set('Authorization', authHeader(providerToken))
      .send({ status: LeadAccessStatus.Completed });
    expect(done.status).toBe(200);
    expect(done.body.data.status).toBe(LeadAccessStatus.Completed);

    await request(app)
      .patch(`/api/v1/categories/${category._id}`)
      .set('Authorization', authHeader(adminToken))
      .send({ creditCost: 30 });
    const priced = await LeadAccess.findById(accessId);
    expect(priced?.creditCost).toBe(12);

    await request(app)
      .patch(`/api/v1/leads/${leadId}/status`)
      .set('Authorization', authHeader(adminToken))
      .send({ status: LeadStatus.Closed });
    const kept = await request(app)
      .get(`/api/v1/lead-accesses/${accessId}`)
      .set('Authorization', authHeader(providerToken));
    expect(kept.status).toBe(200);
    expect(kept.body.data.lead.client.email).toBe('mario@example.com');

    const ownList = await request(app)
      .get('/api/v1/lead-accesses')
      .set('Authorization', authHeader(providerToken));
    expect(ownList.status).toBe(200);
    expect(ownList.body.data).toHaveLength(1);

    const providerAll = await request(app)
      .get('/api/v1/lead-accesses/all')
      .set('Authorization', authHeader(providerToken));
    expect(providerAll.status).toBe(403);

    const adminList = await request(app)
      .get('/api/v1/lead-accesses/all')
      .set('Authorization', authHeader(adminToken));
    expect(adminList.status).toBe(200);
    expect(adminList.body.data[0].lead.client.email).toBe('mario@example.com');

    const clientList = await request(app)
      .get('/api/v1/lead-accesses')
      .set('Authorization', authHeader(clientToken));
    expect(clientList.status).toBe(403);
  });
});

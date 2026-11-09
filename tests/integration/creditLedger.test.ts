import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../../src/app';
import { CreditLedgerType } from '../../src/app/modules/creditLedger/creditLedger.constant';
import { CreditLedger } from '../../src/app/modules/creditLedger/creditLedger.model';
import { Provider } from '../../src/app/modules/provider/provider.model';
import { BusinessType } from '../../src/app/modules/provider/provider.constant';
import { Setting } from '../../src/app/modules/setting/setting.model';
import { User } from '../../src/app/modules/user/user.model';
import { UserRole } from '../../src/app/modules/user/user.constant';
import { authHeader, createTestToken } from '../helpers/auth.helper';
import { createTestUser } from '../helpers/user.helper';

describe('Credit ledger API', () => {
  it('grants welcome credits and records an admin adjustment', async () => {
    await Setting.create({ welcomeCreditAmount: 15 });

    const { token: adminToken, user: admin } = await createTestUser({
      email: 'admin@example.com',
      role: UserRole.Admin,
    });
    const { token: clientToken } = await createTestUser({
      email: 'client@example.com',
      role: UserRole.Client,
    });
    const { user: otherUser, token: otherToken } = await createTestUser({
      email: 'other@example.com',
      role: UserRole.Provider,
    });
    const otherProvider = await Provider.create({
      user: otherUser._id,
      businessName: 'Other Co',
      businessType: BusinessType.Company,
    });

    const noToken = await request(app)
      .post('/api/v1/credit-ledgers/adjust')
      .send({
        provider: otherProvider._id.toString(),
        amount: 5,
        note: 'missing token',
      });
    expect(noToken.status).toBe(401);

    const forbidden = await request(app)
      .post('/api/v1/credit-ledgers/adjust')
      .set('Authorization', authHeader(clientToken))
      .send({
        provider: otherProvider._id.toString(),
        amount: 5,
        note: 'client cannot adjust',
      });
    expect(forbidden.status).toBe(403);

    const missingNote = await request(app)
      .post('/api/v1/credit-ledgers/adjust')
      .set('Authorization', authHeader(adminToken))
      .send({ provider: otherProvider._id.toString(), amount: 5 });
    expect(missingNote.status).toBe(400);
    expect(missingNote.body.success).toBe(false);

    const missingProvider = await request(app)
      .post('/api/v1/credit-ledgers/adjust')
      .set('Authorization', authHeader(adminToken))
      .send({
        provider: '665f1234567890abcdef1234',
        amount: 5,
        note: 'nobody',
      });
    expect(missingProvider.status).toBe(404);
    expect(missingProvider.body.message).toBe('Provider profile not found');

    const registered = await request(app)
      .post('/api/v1/users/register')
      .send({
        firstName: 'New',
        lastName: 'Provider',
        role: UserRole.Provider,
        email: 'new.provider@example.com',
        password: 'Password123!',
        businessName: 'Rossi Impianti',
        businessType: BusinessType.Company,
      });
    expect(registered.status).toBe(200);

    const savedUser = await User.findOne({
      email: 'new.provider@example.com',
    });
    const provider = await Provider.findOne({ user: savedUser?._id });
    expect(provider?.creditBalance).toBe(15);

    const welcome = await CreditLedger.findOne({ provider: provider?._id });
    expect(welcome?.type).toBe(CreditLedgerType.Welcome);
    expect(welcome?.amount).toBe(15);
    expect(welcome?.balanceAfter).toBe(15);
    expect(welcome?.uid).toMatch(/^CRL-/);
    expect(welcome?.reference).toBeUndefined();
    expect(welcome?.note).toBe('');

    const providerToken = createTestToken(
      UserRole.Provider,
      savedUser!._id.toString(),
      savedUser!.email,
    );

    const providerAdjust = await request(app)
      .post('/api/v1/credit-ledgers/adjust')
      .set('Authorization', authHeader(providerToken))
      .send({
        provider: provider!._id.toString(),
        amount: 5,
        note: 'provider cannot adjust',
      });
    expect(providerAdjust.status).toBe(403);

    const adjusted = await request(app)
      .post('/api/v1/credit-ledgers/adjust')
      .set('Authorization', authHeader(adminToken))
      .send({
        provider: provider!._id.toString(),
        amount: 10,
        note: 'Goodwill credits',
      });
    expect(adjusted.status).toBe(201);
    expect(adjusted.body.message).toBe(
      'Credit adjustment recorded successfully',
    );
    expect(adjusted.body.data.amount).toBe(10);
    expect(adjusted.body.data.balanceAfter).toBe(25);
    expect(adjusted.body.data.createdBy.toString()).toBe(admin._id.toString());

    const tooMany = await request(app)
      .post('/api/v1/credit-ledgers/adjust')
      .set('Authorization', authHeader(adminToken))
      .send({
        provider: provider!._id.toString(),
        amount: -100,
        note: 'take everything',
      });
    expect(tooMany.status).toBe(400);
    expect(tooMany.body.message).toBe('Not enough credits');

    const still = await Provider.findById(provider?._id);
    expect(still?.creditBalance).toBe(25);

    const mine = await request(app)
      .get('/api/v1/credit-ledgers')
      .set('Authorization', authHeader(providerToken));
    expect(mine.status).toBe(200);
    expect(mine.body.data).toHaveLength(2);

    const hidden = await request(app)
      .get(`/api/v1/credit-ledgers/${welcome?._id}`)
      .set('Authorization', authHeader(otherToken));
    expect(hidden.status).toBe(404);
    expect(hidden.body.message).toBe('Credit ledger not found');

    const clientList = await request(app)
      .get('/api/v1/credit-ledgers')
      .set('Authorization', authHeader(clientToken));
    expect(clientList.status).toBe(403);

    const adminList = await request(app)
      .get('/api/v1/credit-ledgers/all')
      .set('Authorization', authHeader(adminToken));
    expect(adminList.status).toBe(200);
    expect(adminList.body.data).toHaveLength(2);

    const client = await request(app).post('/api/v1/users/register').send({
      firstName: 'New',
      lastName: 'Client',
      role: UserRole.Client,
      email: 'new.client@example.com',
      password: 'Password123!',
    });
    expect(client.status).toBe(200);
    expect(await CreditLedger.countDocuments()).toBe(2);
  });
});

import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../../src/app';
import { CreditLedgerType } from '../../src/app/modules/creditLedger/creditLedger.constant';
import { CreditLedger } from '../../src/app/modules/creditLedger/creditLedger.model';
import { Provider } from '../../src/app/modules/provider/provider.model';
import { BusinessType } from '../../src/app/modules/provider/provider.constant';
import { User } from '../../src/app/modules/user/user.model';
import { UserRole, UserStatus } from '../../src/app/modules/user/user.constant';
import { authHeader } from '../helpers/auth.helper';
import { harness } from '../harness';
import { createTestUser } from '../helpers/user.helper';

describe('User API', () => {
  it('registers a client or a provider and rejects a staff role', async () => {
    const createdClient = await request(app)
      .post('/api/v1/users/register')
      .send({
        firstName: 'New',
        lastName: 'Client',
        role: UserRole.Client,
        email: 'new.client@example.com',
        password: 'Password123!',
      });

    expect(createdClient.status).toBe(200);
    expect(createdClient.body.message).toMatch(/verify your email/i);

    const savedClient = await User.findOne({ email: 'new.client@example.com' });
    expect(savedClient?.role).toBe(UserRole.Client);
    expect(savedClient?.isEmailVerified).toBe(false);

    harness().queueAddSpy.mockClear();
    harness().sendMailSpy.mockClear();

    const createdProvider = await request(app)
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

    expect(createdProvider.status).toBe(200);
    const savedProvider = await User.findOne({
      email: 'new.provider@example.com',
    });
    expect(savedProvider?.role).toBe(UserRole.Provider);

    const providerProfile = await Provider.findOne({
      user: savedProvider?._id,
    });
    expect(providerProfile?.businessName).toBe('Rossi Impianti');
    expect(providerProfile?.creditBalance).toBe(15);
    const welcome = await CreditLedger.findOne({
      provider: providerProfile?._id,
    });
    expect(welcome?.type).toBe(CreditLedgerType.Welcome);
    expect(welcome?.amount).toBe(15);
    expect(savedProvider?.roleRef?.toString()).toBe(
      providerProfile?._id.toString(),
    );
    expect(harness().sendMailSpy).not.toHaveBeenCalled();
    expect(harness().queueAddSpy).toHaveBeenCalledWith(
      'send-email',
      expect.objectContaining({ to: 'new.provider@example.com' }),
      expect.any(Object),
    );

    expect(await Provider.countDocuments({ user: savedClient?._id })).toBe(0);

    const missingCompany = await request(app)
      .post('/api/v1/users/register')
      .send({
        firstName: 'New',
        lastName: 'Provider',
        role: UserRole.Provider,
        email: 'missing.company@example.com',
        password: 'Password123!',
      });
    expect(missingCompany.status).toBe(400);
    expect(missingCompany.body.success).toBe(false);

    const rejectedAdmin = await request(app)
      .post('/api/v1/users/register')
      .send({
        firstName: 'Admin',
        lastName: 'Nope',
        role: UserRole.Admin,
        email: 'new.admin@example.com',
        password: 'Password123!',
      });

    expect(rejectedAdmin.status).toBe(400);
    expect(rejectedAdmin.body.success).toBe(false);
    expect(rejectedAdmin.body.errorMessages).toBeDefined();
  });

  it('returns 429 after too many registration attempts', async () => {
    let lastStatus = 0;
    for (let attempt = 0; attempt < 11; attempt += 1) {
      const res = await request(app)
        .post('/api/v1/users/register')
        .send({
          firstName: 'New',
          lastName: 'Client',
          role: UserRole.Client,
          email: `rate.limit.${attempt}@example.com`,
          password: 'Password123!',
        });
      lastStatus = res.status;
      if (attempt < 10) {
        expect(res.status).toBe(200);
      }
    }

    expect(lastStatus).toBe(429);
    expect(await User.countDocuments({ email: /^rate\.limit\./ })).toBe(10);
  });

  it('lets a user read and update their profile', async () => {
    const { token } = await createTestUser();

    const profile = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', authHeader(token));

    expect(profile.status).toBe(200);
    expect(profile.body.data.email).toBe('jane.doe@example.com');

    const updated = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', authHeader(token))
      .send({ firstName: 'Janet' });

    expect(updated.status).toBe(200);
    expect(updated.body.data.firstName).toBe('Janet');

    const companyOnClient = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', authHeader(token))
      .send({ businessName: 'Not a company' });
    expect(companyOnClient.status).toBe(400);
    expect(companyOnClient.body.success).toBe(false);
  });

  it('lets a provider update the company profile', async () => {
    const { user, token } = await createTestUser({
      email: 'company@example.com',
      role: UserRole.Provider,
    });
    const provider = await Provider.create({
      user: user._id,
      businessName: 'Old Name',
      businessType: BusinessType.Individual,
      creditBalance: 0,
    });
    await User.findByIdAndUpdate(user._id, { roleRef: provider._id });

    const updated = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', authHeader(token))
      .send({
        businessName: 'Rossi Impianti',
        businessType: BusinessType.Company,
      });

    expect(updated.status).toBe(200);
    expect(updated.body.data.roleRef.businessName).toBe('Rossi Impianti');

    const profile = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', authHeader(token));
    expect(profile.status).toBe(200);
    expect(profile.body.data.roleRef.businessType).toBe(BusinessType.Company);
  });

  it('lets an admin change status, list, and delete users', async () => {
    const { user } = await createTestUser();
    const { token: adminToken } = await createTestUser({
      email: 'admin@example.com',
      role: UserRole.Admin,
    });
    const { token: userToken } = await createTestUser({
      email: 'other@example.com',
    });

    const forbidden = await request(app)
      .patch(`/api/v1/users/${user._id}/status`)
      .set('Authorization', authHeader(userToken))
      .send({ status: UserStatus.Suspended });
    expect(forbidden.status).toBe(403);

    const statusRes = await request(app)
      .patch(`/api/v1/users/${user._id}/status`)
      .set('Authorization', authHeader(adminToken))
      .send({ status: UserStatus.Suspended });
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.status).toBe(UserStatus.Suspended);

    const list = await request(app)
      .get('/api/v1/users/all')
      .set('Authorization', authHeader(adminToken));
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body.data)).toBe(true);

    const userList = await request(app)
      .get('/api/v1/users/all')
      .set('Authorization', authHeader(userToken));
    expect(userList.status).toBe(403);

    const deleted = await request(app)
      .delete(`/api/v1/users/${user._id}`)
      .set('Authorization', authHeader(adminToken));
    expect(deleted.status).toBe(200);

    const stored = await User.findById(user._id);
    expect(stored?.isDeleted).toBe(true);
  });
});

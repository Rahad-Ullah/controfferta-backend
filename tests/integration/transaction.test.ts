import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../../src/app';
import { Transaction } from '../../src/app/modules/transaction/transaction.model';
import {
  TransactionGateway,
  TransactionReferenceType,
  TransactionStatus,
  TransactionType,
} from '../../src/app/modules/transaction/transaction.constants';
import { UserRole } from '../../src/app/modules/user/user.constant';
import { authHeader } from '../helpers/auth.helper';
import { createTestUser } from '../helpers/user.helper';

describe('Transaction API', () => {
  it('lets a user read their transactions and an admin update them', async () => {
    const { user, token } = await createTestUser();
    const { token: adminToken } = await createTestUser({
      email: 'admin@example.com',
      role: UserRole.Admin,
    });

    const txn = await Transaction.create({
      user: user._id,
      reference: {
        type: TransactionReferenceType.Wallet,
        id: '665f1234567890abcdef5678',
      },
      type: TransactionType.Payment,
      gateway: TransactionGateway.Stripe,
      gatewayReferenceId: 'pi_user_1',
      amount: 15,
      status: TransactionStatus.Pending,
    });

    const mine = await request(app)
      .get('/api/v1/transactions/my-transactions')
      .set('Authorization', authHeader(token));
    expect(mine.status).toBe(200);
    expect(mine.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ gatewayReferenceId: 'pi_user_1' }),
      ]),
    );

    const forbidden = await request(app)
      .get('/api/v1/transactions')
      .set('Authorization', authHeader(token));
    expect(forbidden.status).toBe(403);

    const all = await request(app)
      .get('/api/v1/transactions')
      .set('Authorization', authHeader(adminToken));
    expect(all.status).toBe(200);

    const updated = await request(app)
      .patch(`/api/v1/transactions/${txn._id}`)
      .set('Authorization', authHeader(adminToken))
      .send({ status: TransactionStatus.Completed });
    expect(updated.status).toBe(200);
    expect(updated.body.data.status).toBe(TransactionStatus.Completed);
  });
});

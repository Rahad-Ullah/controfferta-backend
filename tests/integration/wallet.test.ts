import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../../src/app';
import { Wallet } from '../../src/app/modules/wallet/wallet.model';
import {
  PayoutProvider,
  SupportedCurrency,
  WalletStatus,
} from '../../src/app/modules/wallet/wallet.constants';
import { UserRole } from '../../src/app/modules/user/user.constant';
import { Transaction } from '../../src/app/modules/transaction/transaction.model';
import { authHeader } from '../helpers/auth.helper';
import { createTestUser } from '../helpers/user.helper';
import { harness } from '../harness';

describe('Wallet API', () => {
  it('connects a Stripe payout method for a user', async () => {
    const { token } = await createTestUser({ role: UserRole.Provider });
    const { token: adminToken } = await createTestUser({
      email: 'admin@example.com',
      role: UserRole.Admin,
    });

    const forbidden = await request(app)
      .post('/api/v1/wallets/payout-method/connect')
      .set('Authorization', authHeader(adminToken))
      .send({
        currency: SupportedCurrency.Usd,
        gatewayBankInfo: { [PayoutProvider.Stripe]: { bankName: 'Test Bank' } },
      });
    expect(forbidden.status).toBe(403);

    const res = await request(app)
      .post('/api/v1/wallets/payout-method/connect')
      .set('Authorization', authHeader(token))
      .send({
        currency: SupportedCurrency.Usd,
        gatewayBankInfo: {
          stripe: { bankName: 'Test Bank', accountNumberLast4: '4242' },
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.data.onboardingUrl).toBe(
      'https://connect.stripe.com/setup/mock',
    );
    expect(harness().stripeMock.accounts.create).toHaveBeenCalled();

    const wallet = await Wallet.findOne();
    expect(wallet?.provider).toBe(PayoutProvider.Stripe);
    expect(wallet?.currency).toBe(SupportedCurrency.Usd);
    expect(wallet?.status).toBe(WalletStatus.PendingOnboarding);
  });

  it('withdraws when the balance covers the amount and rejects when it does not', async () => {
    const { user, token } = await createTestUser({ role: UserRole.Provider });
    await Wallet.create({
      user: user._id,
      status: WalletStatus.Active,
      provider: PayoutProvider.Stripe,
      currency: SupportedCurrency.Usd,
      availableBalance: 25,
      pendingBalance: 0,
      gatewayBankInfo: {
        stripe: { stripeAccountId: 'acct_test_mock123' },
      },
    });

    const tooMuch = await request(app)
      .post('/api/v1/wallets/payout-withdrawal')
      .set('Authorization', authHeader(token))
      .send({ amount: 40 });
    expect(tooMuch.status).toBe(400);
    expect(tooMuch.body.message).toMatch(/insufficient available balance/i);

    const res = await request(app)
      .post('/api/v1/wallets/payout-withdrawal')
      .set('Authorization', authHeader(token))
      .send({ amount: 20 });

    expect(res.status).toBe(200);
    expect(harness().stripeMock.transfers.create).toHaveBeenCalled();

    const txn = await Transaction.findOne({ user: user._id });
    expect(txn?.type).toBe('payout');
    expect(txn?.reference.type).toBe('Wallet');
    expect(txn?.amount).toBe(20);

    const mine = await request(app)
      .get('/api/v1/wallets/my-wallet')
      .set('Authorization', authHeader(token));
    expect(mine.status).toBe(200);
    expect(mine.body.data.availableBalance).toBe(25);
  });
});

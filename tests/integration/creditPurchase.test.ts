import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../../src/app';
import {
  CreditLedgerReferenceType,
  CreditLedgerType,
} from '../../src/app/modules/creditLedger/creditLedger.constant';
import { CreditLedger } from '../../src/app/modules/creditLedger/creditLedger.model';
import { CreditPackageStatus } from '../../src/app/modules/creditPackage/creditPackage.constant';
import { CreditPaymentStatus } from '../../src/app/modules/creditPurchase/creditPurchase.constant';
import { Provider } from '../../src/app/modules/provider/provider.model';
import { BusinessType } from '../../src/app/modules/provider/provider.constant';
import { TransactionStatus } from '../../src/app/modules/transaction/transaction.constants';
import { User } from '../../src/app/modules/user/user.model';
import { UserRole } from '../../src/app/modules/user/user.constant';
import { authHeader } from '../helpers/auth.helper';
import { harness } from '../harness';
import { createTestUser } from '../helpers/user.helper';

const checkoutEvent = (
  id: string,
  type: string,
  purchaseId: string,
  userId: string,
) => ({
  id,
  type,
  data: {
    object: {
      id: 'cs_test_mock123',
      payment_status: type === 'checkout.session.completed' ? 'paid' : 'unpaid',
      currency: 'eur',
      payment_intent: 'pi_test_mock123',
      metadata: {
        userId,
        referenceType: 'credit_purchase',
        referenceId: purchaseId,
      },
    },
  },
});

describe('Credit purchase API', () => {
  it('starts a Stripe payment and marks the linked transaction paid', async () => {
    harness().stripeMock.checkout.sessions.create.mockClear();
    harness().stripeMock.paymentIntents.retrieve.mockClear();

    const { token: adminToken } = await createTestUser({
      email: 'admin@example.com',
      role: UserRole.Admin,
    });
    const { user, token: providerToken } = await createTestUser({
      email: 'provider@example.com',
      role: UserRole.Provider,
    });
    const { token: otherToken } = await createTestUser({
      email: 'other@example.com',
      role: UserRole.Provider,
    });
    const { token: clientToken } = await createTestUser({
      email: 'client@example.com',
      role: UserRole.Client,
    });

    const provider = await Provider.create({
      user: user._id,
      businessName: 'Acme Solar',
      businessType: BusinessType.Company,
    });
    await User.updateOne({ _id: user._id }, { roleRef: provider._id });
    const other = await createTestUser({
      email: 'buyer@example.com',
      role: UserRole.Provider,
    });
    const otherProvider = await Provider.create({
      user: other.user._id,
      businessName: 'Other Co',
      businessType: BusinessType.Company,
    });
    await User.updateOne(
      { _id: other.user._id },
      { roleRef: otherProvider._id },
    );

    const createdPackage = await request(app)
      .post('/api/v1/credit-packages/create')
      .set('Authorization', authHeader(adminToken))
      .send({
        name: 'Starter',
        description: '100 credits',
        creditsAmount: 100,
        price: 49,
      });
    expect(createdPackage.status).toBe(201);
    const packageId = createdPackage.body.data._id;

    const noProfile = await request(app)
      .post('/api/v1/credit-purchases/create')
      .set('Authorization', authHeader(otherToken))
      .send({ package: packageId });
    expect(noProfile.status).toBe(404);
    expect(noProfile.body.message).toBe('Provider profile not found');

    const forbidden = await request(app)
      .post('/api/v1/credit-purchases/create')
      .set('Authorization', authHeader(clientToken))
      .send({ package: packageId });
    expect(forbidden.status).toBe(403);

    const missing = await request(app)
      .post('/api/v1/credit-purchases/create')
      .set('Authorization', authHeader(providerToken))
      .send({ package: '665f1234567890abcdef1234' });
    expect(missing.status).toBe(404);
    expect(missing.body.message).toBe('Credit package not found');

    await request(app)
      .patch(`/api/v1/credit-packages/${packageId}`)
      .set('Authorization', authHeader(adminToken))
      .send({ status: CreditPackageStatus.Inactive });

    const unavailable = await request(app)
      .post('/api/v1/credit-purchases/create')
      .set('Authorization', authHeader(providerToken))
      .send({ package: packageId });
    expect(unavailable.status).toBe(400);
    expect(unavailable.body.message).toBe(
      'This credit package is not available',
    );

    await request(app)
      .patch(`/api/v1/credit-packages/${packageId}`)
      .set('Authorization', authHeader(adminToken))
      .send({ status: CreditPackageStatus.Active });

    const started = await request(app)
      .post('/api/v1/credit-purchases/create')
      .set('Authorization', authHeader(providerToken))
      .send({ package: packageId });
    expect(started.status).toBe(201);
    expect(started.body.message).toBe('Credit purchase started successfully');
    expect(started.body.data.checkoutUrl).toBe(
      'https://checkout.stripe.com/pay/mock',
    );
    expect(started.body.data.purchase.uid).toMatch(/^PUR-/);
    expect(started.body.data.purchase.paymentStatus).toBe(
      CreditPaymentStatus.Unpaid,
    );
    expect(started.body.data.purchase.creditsAmount).toBe(100);
    expect(started.body.data.purchase.pricing).toMatchObject({
      subtotal: 49,
      discount: 0,
      total: 49,
      currency: 'EUR',
    });
    expect(started.body.data.transaction).toMatchObject({
      amount: 49,
      currency: 'EUR',
      status: TransactionStatus.Pending,
      isPaid: false,
      reference: { type: 'credit_purchase' },
    });

    const checkoutCall =
      harness().stripeMock.checkout.sessions.create.mock.calls.at(-1)?.[0];
    expect(checkoutCall.mode).toBe('payment');
    expect(checkoutCall.line_items).toEqual([
      { price: 'price_test_mock123', quantity: 1 },
    ]);
    expect(checkoutCall).not.toHaveProperty('payment_method_types');

    const purchaseId = started.body.data.purchase._id;

    const mine = await request(app)
      .get('/api/v1/credit-purchases')
      .set('Authorization', authHeader(providerToken));
    expect(mine.status).toBe(200);
    expect(mine.body.data).toHaveLength(1);
    expect(mine.body.data[0].package.name).toBe('Starter');

    const hidden = await request(app)
      .get(`/api/v1/credit-purchases/${purchaseId}`)
      .set('Authorization', authHeader(other.token));
    expect(hidden.status).toBe(404);

    const adminList = await request(app)
      .get('/api/v1/credit-purchases/all')
      .set('Authorization', authHeader(providerToken));
    expect(adminList.status).toBe(403);

    const sendWebhook = (event: ReturnType<typeof checkoutEvent>) => {
      harness().stripeMock.webhooks.constructEvent.mockImplementationOnce(
        () => event,
      );
      return request(app)
        .post('/webhooks/stripe')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', 't=1,v1=abc')
        .send('{}');
    };

    const paid = await sendWebhook(
      checkoutEvent(
        'evt_credit_paid_1',
        'checkout.session.completed',
        purchaseId,
        user._id.toString(),
      ),
    );
    expect(paid.status).toBe(200);

    const replay = await sendWebhook(
      checkoutEvent(
        'evt_credit_paid_2',
        'checkout.session.completed',
        purchaseId,
        user._id.toString(),
      ),
    );
    expect(replay.status).toBe(200);
    expect(harness().stripeMock.paymentIntents.retrieve).toHaveBeenCalledTimes(
      1,
    );

    const view = await request(app)
      .get(`/api/v1/credit-purchases/${purchaseId}`)
      .set('Authorization', authHeader(adminToken));
    expect(view.status).toBe(200);
    expect(view.body.data.paymentStatus).toBe(CreditPaymentStatus.Paid);
    expect(view.body.data.transaction).toMatchObject({
      amount: 49,
      currency: 'EUR',
      status: TransactionStatus.Completed,
      isPaid: true,
      gatewayFee: 1,
      gatewayReferenceId: 'pi_test_mock123',
    });

    const transactions = await request(app)
      .get('/api/v1/transactions/all')
      .set('Authorization', authHeader(adminToken));
    expect(transactions.status).toBe(200);
    expect(transactions.body.data[0].reference.id.uid).toMatch(/^PUR-/);
    expect(transactions.body.data[0].amount).toBe(49);

    const sold = await request(app)
      .get(`/api/v1/credit-packages/${packageId}`)
      .set('Authorization', authHeader(adminToken));
    expect(sold.body.data.purchaseCount).toBe(1);

    const balance = await Provider.findById(provider._id);
    expect(balance?.creditBalance).toBe(100);
    const ledger = await CreditLedger.find({ provider: provider._id });
    expect(ledger).toHaveLength(1);
    expect(ledger[0].type).toBe(CreditLedgerType.Purchase);
    expect(ledger[0].amount).toBe(100);
    expect(ledger[0].balanceAfter).toBe(100);
    expect(ledger[0].reference?.type).toBe(
      CreditLedgerReferenceType.CreditPurchase,
    );

    const second = await request(app)
      .post('/api/v1/credit-purchases/create')
      .set('Authorization', authHeader(providerToken))
      .send({ package: packageId });
    expect(second.status).toBe(201);

    const expired = await sendWebhook(
      checkoutEvent(
        'evt_credit_expired_1',
        'checkout.session.expired',
        second.body.data.purchase._id,
        user._id.toString(),
      ),
    );
    expect(expired.status).toBe(200);

    const expiredView = await request(app)
      .get(`/api/v1/credit-purchases/${second.body.data.purchase._id}`)
      .set('Authorization', authHeader(providerToken));
    expect(expiredView.body.data.paymentStatus).toBe(
      CreditPaymentStatus.Unpaid,
    );
    expect(expiredView.body.data.transaction.status).toBe(
      TransactionStatus.Cancelled,
    );

    const stillOne = await request(app).get(
      `/api/v1/credit-packages/${packageId}`,
    );
    expect(stillOne.body.data.purchaseCount).toBe(1);
    expect(await CreditLedger.countDocuments({ provider: provider._id })).toBe(
      1,
    );
    const afterExpiry = await Provider.findById(provider._id);
    expect(afterExpiry?.creditBalance).toBe(100);
  });

  it('takes the credits back when the paid charge is refunded', async () => {
    const { token: adminToken } = await createTestUser({
      email: 'admin@example.com',
      role: UserRole.Admin,
    });
    const { user, token: providerToken } = await createTestUser({
      email: 'provider@example.com',
      role: UserRole.Provider,
    });
    const provider = await Provider.create({
      user: user._id,
      businessName: 'Acme Solar',
      businessType: BusinessType.Company,
    });
    await User.updateOne({ _id: user._id }, { roleRef: provider._id });

    const createdPackage = await request(app)
      .post('/api/v1/credit-packages/create')
      .set('Authorization', authHeader(adminToken))
      .send({
        name: 'Starter',
        description: '100 credits',
        creditsAmount: 100,
        price: 49,
      });
    expect(createdPackage.status).toBe(201);
    const packageId = createdPackage.body.data._id;

    const started = await request(app)
      .post('/api/v1/credit-purchases/create')
      .set('Authorization', authHeader(providerToken))
      .send({ package: packageId });
    expect(started.status).toBe(201);
    const purchaseId = started.body.data.purchase._id;

    const sendWebhook = (event: {
      id: string;
      type: string;
      data: { object: Record<string, unknown> };
    }) => {
      harness().stripeMock.webhooks.constructEvent.mockImplementationOnce(
        () => event,
      );
      return request(app)
        .post('/webhooks/stripe')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', 't=1,v1=abc')
        .send('{}');
    };

    const paid = await sendWebhook(
      checkoutEvent(
        'evt_credit_refund_paid',
        'checkout.session.completed',
        purchaseId,
        user._id.toString(),
      ),
    );
    expect(paid.status).toBe(200);

    await Provider.updateOne({ _id: provider._id }, { creditBalance: 10 });
    const spent = await sendWebhook({
      id: 'evt_credit_refund_spent',
      type: 'charge.refunded',
      data: {
        object: {
          id: 'ch_test_mock123',
          payment_intent: 'pi_test_mock123',
          metadata: {},
        },
      },
    });
    expect(spent.status).toBe(500);
    const stillPaid = await Provider.findById(provider._id);
    expect(stillPaid?.creditBalance).toBe(10);

    await Provider.updateOne({ _id: provider._id }, { creditBalance: 100 });
    const refunded = await sendWebhook({
      id: 'evt_credit_refund_1',
      type: 'charge.refunded',
      data: {
        object: {
          id: 'ch_test_mock123',
          payment_intent: 'pi_test_mock123',
          metadata: {},
        },
      },
    });
    expect(refunded.status).toBe(200);

    const again = await sendWebhook({
      id: 'evt_credit_refund_2',
      type: 'charge.refunded',
      data: {
        object: {
          id: 'ch_test_mock123',
          payment_intent: 'pi_test_mock123',
          metadata: {},
        },
      },
    });
    expect(again.status).toBe(200);

    const view = await request(app)
      .get(`/api/v1/credit-purchases/${purchaseId}`)
      .set('Authorization', authHeader(adminToken));
    expect(view.body.data.paymentStatus).toBe(CreditPaymentStatus.Refunded);

    const balance = await Provider.findById(provider._id);
    expect(balance?.creditBalance).toBe(0);
    const ledger = await CreditLedger.find({ provider: provider._id }).sort({
      amount: -1,
    });
    expect(ledger).toHaveLength(2);
    expect(ledger[1]).toMatchObject({
      type: CreditLedgerType.Refund,
      amount: -100,
      balanceAfter: 0,
    });

    const sold = await request(app).get(`/api/v1/credit-packages/${packageId}`);
    expect(sold.body.data.purchaseCount).toBe(0);
  });
});

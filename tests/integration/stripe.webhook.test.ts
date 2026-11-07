import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../../src/app';
import { Transaction } from '../../src/app/modules/transaction/transaction.model';
import { StripeEvent } from '../../src/app/modules/stripeEvent/stripeEvent.model';
import { harness } from '../harness';

describe('POST /webhooks/stripe', () => {
  beforeEach(() => {
    harness().stripeMock.paymentIntents.retrieve.mockClear();
    harness().stripeMock.webhooks.constructEvent.mockClear();
  });

  it('rejects an invalid signature', async () => {
    const res = await request(app)
      .post('/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 'invalid')
      .send('{}');

    expect(res.status).toBe(400);
    expect(res.text).toMatch(/Webhook Error/i);
    expect(harness().stripeMock.paymentIntents.retrieve).not.toHaveBeenCalled();
  });

  it('records a checkout and ignores a repeated event id', async () => {
    const send = () =>
      request(app)
        .post('/webhooks/stripe')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', 't=1,v1=abc')
        .send('{}');

    const first = await send();
    expect(first.status).toBe(200);
    expect(first.body).toEqual({ received: true });

    const txn = await Transaction.findOne({
      gatewayReferenceId: 'pi_test_mock123',
    });
    expect(txn?.amount).toBe(50);
    expect(txn?.gatewayFee).toBe(1);
    expect(txn?.netAmount).toBe(50);
    expect(txn?.reference.type).toBe('Order');

    const second = await send();
    expect(second.status).toBe(200);
    expect(harness().stripeMock.paymentIntents.retrieve).toHaveBeenCalledTimes(1);
    expect(await StripeEvent.countDocuments()).toBe(1);
    expect(await Transaction.countDocuments()).toBe(1);
  });
});

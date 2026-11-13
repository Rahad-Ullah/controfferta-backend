import { StripeWebhookServices } from './stripe.service';
import { StripeEvent as StripeEventModel } from '../../modules/stripeEvent/stripeEvent.model';
import type { Stripe } from 'stripe/types';

export async function stripeEventHandler(event: Stripe.Event) {
  // Idempotency guard
  const alreadyProcessed = await StripeEventModel.exists({ id: event.id });
  if (alreadyProcessed) {
    return;
  }

  // log event in database
  try {
    await StripeEventModel.create({
      id: event.id,
      type: event.type,
    });
  } catch (err: any) {
    if (err.code === 11000) return; // already processed
    throw err;
  }

  // event routing
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await StripeWebhookServices.onCheckoutSessionCompleted(event);
        break;

      case 'checkout.session.async_payment_succeeded':
        await StripeWebhookServices.onCheckoutSessionCompleted(event);
        break;

      case 'checkout.session.async_payment_failed':
        await StripeWebhookServices.onAsyncPaymentFailed(event);
        break;

      case 'checkout.session.expired':
        await StripeWebhookServices.onCheckoutSessionExpired(event);
        break;

      case 'charge.refunded':
        await StripeWebhookServices.onRefundSuccess(event);
        break;

      case 'refund.failed':
        await StripeWebhookServices.onRefundFailed(event);
        break;

      case 'account.updated':
        await StripeWebhookServices.onAccountUpdated(event);
        break;

      case 'transfer.created':
        await StripeWebhookServices.onTransferCreated(event);
        break;

      case 'transfer.reversed':
        await StripeWebhookServices.onTransferReversed(event);
        break;

      default:
    }
  } catch (error: any) {
    await StripeEventModel.deleteOne({ id: event.id });
    throw error;
  }
}

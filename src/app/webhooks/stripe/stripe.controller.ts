import { Request, Response } from 'express';
import { stripe } from '../../../config/stripe';
import config from '../../../config';
import { stripeEventHandler } from './stripe.handler';
import type { Stripe } from 'stripe/types';

export const stripeWebhookController = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig!,
      config.stripe.webhook_secret!
    );
  } catch (err: unknown) {
    console.error('Stripe webhook signature failed:', err);
    return res.status(400).send('Webhook Error');
  }

  try {
    await stripeEventHandler(event);
  } catch (err) {
    console.error('Stripe webhook processing failed:', err);
    return res.status(500).json({ received: false });
  }

  res.status(200).json({ received: true });
};

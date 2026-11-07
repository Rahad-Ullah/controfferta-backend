import Stripe from 'stripe';
import config from '.';

if (!config.stripe.secret_key) {
  throw new Error('Stripe secret key is not defined');
}

if (!config.stripe.api_version) {
  throw new Error('Stripe API version is not defined');
}

export const stripe = new Stripe(config.stripe.secret_key as string, {
  apiVersion: config.stripe.api_version as any,
});

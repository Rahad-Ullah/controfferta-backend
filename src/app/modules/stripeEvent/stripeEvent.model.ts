import { Schema, model } from 'mongoose';
import { IStripeEvent, StripeEventModel } from './stripeEvent.interface';

const stripeEventSchema = new Schema<IStripeEvent, StripeEventModel>({
  id: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  processedAt: { type: Date, default: new Date() },
});

export const StripeEvent = model<IStripeEvent, StripeEventModel>(
  'StripeEvent',
  stripeEventSchema
);

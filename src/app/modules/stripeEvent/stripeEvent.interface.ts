import { Model, Types } from 'mongoose';

export type IStripeEvent = {
  _id: Types.ObjectId;
  id: string;
  type: string;
  processedAt: Date;
};

export type StripeEventModel = Model<IStripeEvent>;

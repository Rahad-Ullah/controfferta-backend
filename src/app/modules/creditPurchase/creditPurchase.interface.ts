import { Model, Types } from 'mongoose';
import { CreditPaymentStatus } from './creditPurchase.constant';

export type ICreditPurchasePricing = {
  subtotal: number;
  discount: number;
  total: number;
  currency: string;
};

export type ICreditPurchase = {
  _id: Types.ObjectId;
  uid: string;
  provider: Types.ObjectId;
  package: Types.ObjectId;
  creditsAmount: number;
  pricing: ICreditPurchasePricing;
  paymentStatus: CreditPaymentStatus;
  transaction?: Types.ObjectId;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CreditPurchaseModel = Model<ICreditPurchase>;

import { Model, Types } from 'mongoose';
import {
  CreditPackageStatus,
  CreditPackageTag,
} from './creditPackage.constant';

export type ICreditPackage = {
  _id: Types.ObjectId;
  name: string;
  description: string;
  creditsAmount: number;
  price: number;
  tag?: CreditPackageTag;
  stripeProductId: string;
  stripePriceId: string;
  status: CreditPackageStatus;
  purchaseCount: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CreditPackageModel = Model<ICreditPackage>;

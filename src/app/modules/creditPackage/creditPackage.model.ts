import { Schema, model } from 'mongoose';
import {
  CreditPackageStatus,
  CreditPackageTag,
} from './creditPackage.constant';
import { CreditPackageModel, ICreditPackage } from './creditPackage.interface';

const creditPackageSchema = new Schema<ICreditPackage, CreditPackageModel>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    creditsAmount: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    tag: {
      type: String,
      enum: Object.values(CreditPackageTag),
    },
    stripeProductId: {
      type: String,
      required: true,
      trim: true,
    },
    stripePriceId: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(CreditPackageStatus),
      default: CreditPackageStatus.Active,
    },
    purchaseCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

export const CreditPackage = model<ICreditPackage, CreditPackageModel>(
  'CreditPackage',
  creditPackageSchema,
);

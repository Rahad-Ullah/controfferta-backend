import { Schema, model } from 'mongoose';
import { autoIncrementPlugin } from '../../../DB/autoIncrementPlugin';
import { CreditPaymentStatus } from './creditPurchase.constant';
import {
  CreditPurchaseModel,
  ICreditPurchase,
} from './creditPurchase.interface';

const creditPurchaseSchema = new Schema<ICreditPurchase, CreditPurchaseModel>(
  {
    uid: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    provider: {
      type: Schema.Types.ObjectId,
      ref: 'Provider',
      required: true,
    },
    package: {
      type: Schema.Types.ObjectId,
      ref: 'CreditPackage',
      required: true,
    },
    creditsAmount: {
      type: Number,
      required: true,
      min: 1,
    },
    pricing: {
      subtotal: {
        type: Number,
        required: true,
        min: 0,
      },
      discount: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },
      total: {
        type: Number,
        required: true,
        min: 0,
      },
      currency: {
        type: String,
        required: true,
        default: 'EUR',
      },
    },
    paymentStatus: {
      type: String,
      enum: Object.values(CreditPaymentStatus),
      default: CreditPaymentStatus.Unpaid,
    },
    transaction: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

creditPurchaseSchema.plugin(autoIncrementPlugin, {
  incField: 'uid',
  prefix: 'PUR',
  counterId: 'credit_purchase_sequence',
  padLength: 6,
});

// model name matches Transaction.reference.type so the transaction list can populate the purchase
export const CreditPurchase = model<ICreditPurchase, CreditPurchaseModel>(
  'credit_purchase',
  creditPurchaseSchema,
);

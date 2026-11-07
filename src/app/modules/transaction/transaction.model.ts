import { Schema, model } from 'mongoose';
import { ITransaction, TransactionModel } from './transaction.interface';
import { TransactionGateway, TransactionReferenceType, TransactionStatus, TransactionType } from './transaction.constants';
import { autoIncrementPlugin } from '../../../DB/autoIncrementPlugin';

const transactionSchema = new Schema<ITransaction, TransactionModel>({
  uid: {
    type: String,
    unique: true,
    index: true,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  reference: {
    type: {
      type: String,
      enum: TransactionReferenceType,
      required: true,
    },
    id: {
      type: String,
      refPath: 'reference.type'
    },
  },
  type: {
    type: String,
    enum: TransactionType,
    required: true,
  },
  gateway: {
    type: String,
    enum: TransactionGateway,
    required: true,
    index: true,
  },
  gatewayReferenceId: {
    type: String,
    required: true,
    index: true,
  },
  paymentMethod: {
    type: String,
  },
  amount: {
    type: Number,
    required: true,
  },
  gatewayFee: {
    type: Number,
  },
  platformFeePercentage: {
    type: Number,
  },
  platformFee: {
    type: Number,
  },
  netAmount: {
    type: Number,
  },
  currency: {
    type: String,
    default: 'USD',
  },
  status: {
    type: String,
    enum: Object.values(TransactionStatus),
    default: TransactionStatus.Pending,
  },
  isPaid: {
    type: Boolean,
    default: false,
  },
  paidAt: {
    type: Date,
  },
}, { timestamps: true });

// auto increment uid
transactionSchema.plugin(autoIncrementPlugin, {
  incField: 'uid',
  prefix: 'TXN',
  counterId: 'transaction_sequence',
  padLength: 6
});

export const Transaction = model<ITransaction, TransactionModel>(
  'Transaction',
  transactionSchema
);
import { Schema, model } from 'mongoose';
import { autoIncrementPlugin } from '../../../DB/autoIncrementPlugin';
import {
  CreditLedgerReferenceType,
  CreditLedgerType,
} from './creditLedger.constant';
import { CreditLedgerModel, ICreditLedger } from './creditLedger.interface';

const creditLedgerReferenceSchema = new Schema(
  {
    type: {
      type: String,
      enum: Object.values(CreditLedgerReferenceType),
      required: true,
    },
    id: {
      type: Schema.Types.ObjectId,
      refPath: 'reference.type',
      required: true,
    },
  },
  { _id: false },
);

const creditLedgerSchema = new Schema<ICreditLedger, CreditLedgerModel>(
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
    type: {
      type: String,
      enum: Object.values(CreditLedgerType),
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    reference: {
      type: creditLedgerReferenceSchema,
      default: undefined,
    },
    note: {
      type: String,
      default: '',
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// welcome and adjustment rows have no purchase or lead access behind them
creditLedgerSchema.pre('validate', function (next) {
  if (!this.reference?.id) this.set('reference', undefined);
  next();
});

// one row per purchase or lead access and type, so a retry cannot post twice
creditLedgerSchema.index(
  { 'reference.type': 1, 'reference.id': 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: { 'reference.id': { $type: 'objectId' } },
  },
);

creditLedgerSchema.plugin(autoIncrementPlugin, {
  incField: 'uid',
  prefix: 'CRL',
  counterId: 'credit_ledger_sequence',
  padLength: 6,
});

export const CreditLedger = model<ICreditLedger, CreditLedgerModel>(
  'CreditLedger',
  creditLedgerSchema,
);

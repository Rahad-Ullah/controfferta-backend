import { Model, Types } from 'mongoose';
import {
  CreditLedgerReferenceType,
  CreditLedgerType,
} from './creditLedger.constant';

export type ICreditLedgerReference = {
  type: CreditLedgerReferenceType;
  id: Types.ObjectId;
};

export type ICreditLedger = {
  _id: Types.ObjectId;
  uid: string;
  provider: Types.ObjectId;
  type: CreditLedgerType;
  amount: number;
  balanceAfter: number;
  reference?: ICreditLedgerReference;
  note: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
};

export type CreditLedgerModel = Model<ICreditLedger>;

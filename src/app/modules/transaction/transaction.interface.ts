import { Model, ObjectId } from 'mongoose';
import {
  TransactionGateway,
  TransactionReferenceType,
  TransactionStatus,
  TransactionType,
} from './transaction.constants';
import { IUser } from '../user/user.interface';

export interface ITransaction {
  _id: ObjectId;
  uid: string;
  user: ObjectId | IUser;
  reference: {
    type: TransactionReferenceType;
    id: ObjectId;
  };
  type: TransactionType;
  gateway: TransactionGateway;
  gatewayReferenceId: string;
  paymentMethod: string;
  amount: number;
  gatewayFee: number;
  platformFeePercentage: number;
  platformFee: number;
  netAmount: number;
  currency: string;
  status: TransactionStatus;
  isPaid: boolean;
  paidAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type TransactionModel = Model<ITransaction>;

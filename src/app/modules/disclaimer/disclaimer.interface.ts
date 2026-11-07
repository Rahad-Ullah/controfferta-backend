import { Model, ObjectId } from 'mongoose';
import { DisclaimerType } from './disclaimer.constants';

export interface IDisclaimer {
  _id: ObjectId;
  type: DisclaimerType;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export type DisclaimerModel = Model<IDisclaimer>;
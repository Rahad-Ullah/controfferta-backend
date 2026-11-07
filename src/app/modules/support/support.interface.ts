import { Model, Types } from 'mongoose';
import { SupportStatus, SupportType } from './support.constants';

export interface ISupport {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  type: SupportType;
  title: string;
  message: string;
  phone?: string;
  status: SupportStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type SupportModel = Model<ISupport>;
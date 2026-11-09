import { Model, Types } from 'mongoose';
import { SupportPriority, SupportStatus } from './support.constants';

export interface ISupport {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  message: string;
  status: SupportStatus;
  priority: SupportPriority;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type SupportModel = Model<ISupport>;

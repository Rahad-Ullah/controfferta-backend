import { Model, Types } from 'mongoose';
import { LeadAccessStatus } from './leadAccess.constant';

export type ILeadAccess = {
  _id: Types.ObjectId;
  lead: Types.ObjectId;
  provider: Types.ObjectId;
  creditCost: number;
  status: LeadAccessStatus;
  isDeleted: boolean;
  unlockedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type LeadAccessModel = Model<ILeadAccess>;

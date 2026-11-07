import { Model, Types } from 'mongoose';
import { BusinessType } from './provider.constant';

export interface IProvider {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  businessName: string;
  businessType: BusinessType;
  bio: string;
  interestedCategories: Types.ObjectId[];
  creditBalance: number;
}

export type ProviderModel = Model<IProvider>;

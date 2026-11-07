import { Schema, model } from 'mongoose';
import { BusinessType } from './provider.constant';
import { IProvider, ProviderModel } from './provider.interface';

const providerSchema = new Schema<IProvider, ProviderModel>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  businessName: {
    type: String,
    required: true,
    trim: true,
  },
  businessType: {
    type: String,
    enum: Object.values(BusinessType),
    default: BusinessType.Company,
  },
  bio: {
    type: String,
    default: '',
    trim: true,
  },
  interestedCategories: {
    type: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Category',
      },
    ],
    default: [],
  },
  creditBalance: {
    type: Number,
    default: 0,
    min: 0,
  },
});

export const Provider = model<IProvider, ProviderModel>(
  'Provider',
  providerSchema,
);

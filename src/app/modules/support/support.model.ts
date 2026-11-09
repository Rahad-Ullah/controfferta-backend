import { Schema, model } from 'mongoose';
import { SupportPriority, SupportStatus } from './support.constants';
import { ISupport, SupportModel } from './support.interface';

const supportSchema = new Schema<ISupport, SupportModel>(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(SupportStatus),
      default: SupportStatus.Open,
    },
    priority: {
      type: String,
      enum: Object.values(SupportPriority),
      default: SupportPriority.Medium,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

export const Support = model<ISupport, SupportModel>('Support', supportSchema);

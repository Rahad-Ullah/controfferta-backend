import { Schema, model } from 'mongoose';
import { ISupport, SupportModel } from './support.interface';
import { SupportStatus, SupportType } from './support.constants';

const supportSchema = new Schema<ISupport, SupportModel>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: Object.values(SupportType),
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  message: {
    type: String,
    required: true,
    trim: true,
    minlength: 10,
  },
  phone: {
    type: String,
    trim: true,
    default: ""
  },
  status: {
    type: String,
    enum: Object.values(SupportStatus),
    default: SupportStatus.Open,
  },
},
  { timestamps: true });

export const Support = model<ISupport, SupportModel>(
  'Support',
  supportSchema
);
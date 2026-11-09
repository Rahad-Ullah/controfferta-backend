import { Schema, model } from 'mongoose';
import { PlatformReviewStatus } from './platformReview.constant';
import {
  IPlatformReview,
  PlatformReviewModel,
} from './platformReview.interface';

const platformReviewSchema = new Schema<IPlatformReview, PlatformReviewModel>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(PlatformReviewStatus),
      default: PlatformReviewStatus.Pending,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

export const PlatformReview = model<IPlatformReview, PlatformReviewModel>(
  'PlatformReview',
  platformReviewSchema,
);

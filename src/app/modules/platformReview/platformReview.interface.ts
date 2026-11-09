import { Model, Types } from 'mongoose';
import { PlatformReviewStatus } from './platformReview.constant';

export type IPlatformReview = {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  rating: number;
  message: string;
  status: PlatformReviewStatus;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type PlatformReviewModel = Model<IPlatformReview>;

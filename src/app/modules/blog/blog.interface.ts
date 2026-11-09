import { Model, Types } from 'mongoose';
import { BlogStatus } from './blog.constant';

export type IBlog = {
  _id: Types.ObjectId;
  category: Types.ObjectId;
  title: string;
  description: string;
  bodyContent: string;
  imageUrl: string;
  author: Types.ObjectId;
  status: BlogStatus;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type BlogModel = Model<IBlog>;

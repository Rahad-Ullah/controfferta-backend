import { Schema, model } from 'mongoose';
import { BlogStatus } from './blog.constant';
import { BlogModel, IBlog } from './blog.interface';

const blogSchema = new Schema<IBlog, BlogModel>(
  {
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    bodyContent: {
      type: String,
      required: true,
      trim: true,
    },
    imageUrl: {
      type: String,
      default: '',
      trim: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(BlogStatus),
      default: BlogStatus.Pending,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

export const Blog = model<IBlog, BlogModel>('Blog', blogSchema);

import { Model, Types } from 'mongoose';

export type ICategory = {
  _id: Types.ObjectId;
  name: string;
  description: string;
  iconUrl: string;
  creditCost: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CategoryModel = Model<ICategory>;

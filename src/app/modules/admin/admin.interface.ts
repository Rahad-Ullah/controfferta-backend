import { Model, ObjectId } from 'mongoose';

export interface IAdmin {
  _id: ObjectId;
  user: ObjectId;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type AdminModel = Model<IAdmin>;

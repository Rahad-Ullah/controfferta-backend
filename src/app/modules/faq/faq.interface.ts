import { Model, Types } from 'mongoose';

export type IFaq = {
  _id: Types.ObjectId;
  question: string;
  answer: string;
  createdAt: Date;
  updatedAt: Date;
};

export type FaqModel = Model<IFaq>;
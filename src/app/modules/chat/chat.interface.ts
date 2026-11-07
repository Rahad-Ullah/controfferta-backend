import { Model, Types } from 'mongoose';

export type IChat = {
  _id?: Types.ObjectId;
  participants: Types.ObjectId[];
  isDeleted: boolean;
};

export type ChatModel = Model<IChat>;

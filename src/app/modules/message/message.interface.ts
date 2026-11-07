import { Model, ObjectId } from 'mongoose';
import { MessageType } from './message.constant';

export type IMessage = {
  _id?: ObjectId;
  chat: ObjectId;
  sender: ObjectId;
  type: MessageType;
  content: string;
  seenBy: ObjectId[];
  isDeleted: boolean;
};

export type MessageModel = Model<IMessage>;

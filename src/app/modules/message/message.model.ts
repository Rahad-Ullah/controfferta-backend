import { Schema, model } from 'mongoose';
import { IMessage, MessageModel } from './message.interface';
import { MessageType } from './message.constant';

const messageSchema = new Schema<IMessage, MessageModel>(
  {
    chat: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Chat',
    },
    sender: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    type: {
      type: String,
      enum: Object.values(MessageType),
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    seenBy: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: [],
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const Message = model<IMessage, MessageModel>('Message', messageSchema);

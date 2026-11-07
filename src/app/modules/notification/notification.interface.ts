import { Model, Types } from 'mongoose';
import { NotificationType } from './notification.constant';

export interface INotification {
  _id: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  receiver: Types.ObjectId;
  referenceId: string;
  isRead: boolean;
  createdAt: Date;
}

export type NotificationModel = Model<INotification>;

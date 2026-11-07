import { Schema, model } from 'mongoose';
import { INotification, NotificationModel } from './notification.interface';
import { NotificationType } from './notification.constant';

const notificationSchema = new Schema<INotification, NotificationModel>(
  {
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, default: '' },
    receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    referenceId: { type: String, default: '' },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Notification = model<INotification, NotificationModel>(
  'Notification',
  notificationSchema
);

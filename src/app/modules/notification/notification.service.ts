import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import ApiError from '../../../errors/ApiError';
import { timeAgo } from '../../../utils/timeAgo';
import QueryBuilder from '../../builder/QueryBuilder';
import { Notification } from './notification.model';

// get notifications by user id
const getNotificationsByUserId = async (
  userId: string,
  query: Record<string, any>,
): Promise<{ notifications: any; pagination: any; unreadCount: number }> => {
  const notificationQuery = new QueryBuilder(
    Notification.find({ receiver: userId }).sort('-createdAt'),
    query,
  ).paginate();

  const [notifications, pagination, unreadCount] = await Promise.all([
    notificationQuery.modelQuery.lean().exec(),
    notificationQuery.getPaginationInfo(),
    Notification.countDocuments({ receiver: userId, isRead: false }),
  ]);

  return {
    notifications: notifications.map((notification: any) => {
      return {
        ...notification,
        timeAgo: timeAgo(notification.createdAt),
      };
    }),
    pagination,
    unreadCount,
  };
};

// read single notification by id
const readNotification = async (id: string, userId: string) => {
  const result = await Notification.findOneAndUpdate(
    { _id: id, receiver: userId },
    { isRead: true },
    { new: true },
  );
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Notification not found');
  }

  return result;
};

// read all notifications by user id
const readAllNotifications = async (userId: string) => {
  const result = await Notification.bulkWrite([
    {
      updateMany: {
        filter: { receiver: new Types.ObjectId(userId), isRead: false },
        update: { $set: { isRead: true } },
        upsert: false,
      },
    },
  ]);
  return result;
};

export const NotificationServices = {
  getNotificationsByUserId,
  readNotification,
  readAllNotifications,
};

import { Queue } from 'bullmq';
import { redis } from '../../../config/redis';
import { INotification } from './notification.interface';
import { NotificationQueueJob } from './notification.constant';

export const NOTIFICATION_QUEUE = 'notification-queue';

// Create a new queue
const notificationQueue = new Queue(NOTIFICATION_QUEUE, {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: {
      count: 100,
      age: 24 * 3600, // Keep logs for 24 hours
    },
    removeOnFail: {
      count: 500,
      age: 7 * 24 * 3600, // Keep logs for 7 days
    },
  },
});

/**
 * Dispatch a broadcast notification job
 */
const broadcastToAllUsers = async (
  query: Record<string, unknown>,
  payload: Partial<INotification>,
) => {
  // Add job to the queue
  const job = await notificationQueue.add(
    NotificationQueueJob.BroadcastToUsers,
    { query, payload },
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000, // Retry after 5 seconds, 10 seconds, 20 seconds, etc.
      },
      removeOnComplete: {
        count: 100,
        age: 24 * 3600,
      },
      removeOnFail: {
        count: 500,
        age: 7 * 24 * 3600,
      },
    },
  );
  console.log(`[BullMQ] Notification job added: id-${job.id}`);
  return job;
};

// Export all functions
export const NotificationQueue = {
  broadcastToAllUsers,
};

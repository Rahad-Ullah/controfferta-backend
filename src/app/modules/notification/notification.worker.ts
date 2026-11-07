// workers/notification.worker.ts
import { Worker, Job } from 'bullmq';
import { Types } from 'mongoose';
import { redis } from '../../../config/redis';
import { NOTIFICATION_QUEUE } from './notification.queue';
import { INotification } from './notification.interface';
import { User } from '../user/user.model';
import { sendNotifications } from '../../../helpers/notificationHelper';
import { UserStatus } from '../user/user.constant';

const BATCH_SIZE = 500;

/**
 * Keyset / cursor-based pagination using MongoDB ObjectId (_id > lastId).
 * This is much faster and more memory-efficient than using .skip().
 */
const fetchUserBatch = async (
  lastId: Types.ObjectId | string | null,
  limit: number,
  query: Record<string, unknown>,
) => {
  // default query
  query.isDeleted = false;
  query.status = UserStatus.Active;
  query.isNotificationEnabled = true;

  if (lastId) {
    query._id = { $gt: new Types.ObjectId(lastId) };
  }

  const users = await User.find(query)
    .select('_id email fcmToken firstName lastName') // Select only required fields to save RAM
    .sort({ _id: 1 })
    .limit(limit)
    .lean(); // .lean() returns plain JS objects instead of heavy Mongoose documents

  const nextCursor =
    users.length > 0 ? users[users.length - 1]._id.toString() : null;

  return { users, nextCursor };
};

// notification worker
export const initNotificationWorker = () => {
  const worker = new Worker(
    NOTIFICATION_QUEUE,
    async (
      job: Job<{
        query: Record<string, unknown>;
        payload: Partial<INotification>;
      }>,
    ) => {
      console.info(`[BullMQ] Worker started processing Job ID: ${job.id}`);
      const {
        query,
        payload: { type, title, message, referenceId },
      } = job.data;
      let cursor: string | null = null;
      let totalProcessed = 0;

      do {
        // 1. Fetch users in chunks
        const { users, nextCursor } = await fetchUserBatch(
          cursor,
          BATCH_SIZE,
          query,
        );

        if (!users.length) break;

        // 2. Dispatch notifications
        await Promise.allSettled(
          users.map(user =>
            sendNotifications({
              type,
              title,
              message,
              referenceId,
              receiver: user._id,
            }),
          ),
        );

        totalProcessed += users.length;
        cursor = nextCursor;

        // 3. Update job progress in Redis
        await job.updateProgress({ processed: totalProcessed });
      } while (cursor);

      return { totalSent: totalProcessed };
    },
    {
      connection: redis,
      concurrency: 5,
      limiter: {
        max: 100,
        duration: 1000, // 100 calls per second limit
      },
    },
  );

  // Worker error and completion listeners
  worker.on('completed', job => {
    console.info(
      `[BullMQ] Notification Job ${job.id} completed. Result:`,
      job.returnvalue,
    );
  });

  worker.on('failed', (job, err) => {
    console.error(`Notification Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', err => {
    console.error('Notification Worker Redis Error:', err);
  });

  return worker;
};

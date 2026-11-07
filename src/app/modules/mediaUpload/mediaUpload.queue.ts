import { Queue } from 'bullmq';
import { redis } from '../../../config/redis';

export const MEDIA_CLEANUP_QUEUE = 'media-cleanup-queue';

export const mediaUploadQueue = new Queue(MEDIA_CLEANUP_QUEUE, {
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

export const scheduleMediaCleanupJob = async () => {
  await mediaUploadQueue.add('delete-junk-media', {}, {
    repeat: {
      pattern: '0 */6 * * *', // Every 6 hours
    },
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      count: 10,
      age: 24 * 3600,
    },
    removeOnFail: {
      count: 50,
      age: 7 * 24 * 3600,
    },
  } as any);
};

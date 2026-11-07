import { Worker } from 'bullmq';
import { scheduleMediaCleanupJob } from '../modules/mediaUpload/mediaUpload.queue';
import { initMediaUploadWorker } from '../modules/mediaUpload/mediaUpload.worker';
import { initNotificationWorker } from '../modules/notification/notification.worker';

export interface AppQueuesAndWorkers {
  workers: Worker<any, any, any>[];
  closeWorkers: () => Promise<void>;
}

export const initAppQueuesAndWorkers =
  async (): Promise<AppQueuesAndWorkers> => {
    // 1. Initialize Workers
    const mediaWorker = initMediaUploadWorker();
    const notificationWorker = initNotificationWorker();

    const workers: Worker<any, any, any>[] = [
      mediaWorker,
      notificationWorker,
    ];

    // 2. Schedule Repeatable Jobs
    await scheduleMediaCleanupJob();

    // 3. Helper to gracefully close all workers
    const closeWorkers = async () => {
      await Promise.all(workers.map(worker => worker.close()));
      // console.info('[BullMQ] All workers closed.');
    };

    return { workers, closeWorkers };
  };

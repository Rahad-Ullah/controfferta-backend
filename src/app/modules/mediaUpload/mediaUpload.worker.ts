import { Job, Worker } from 'bullmq';
import { redis } from '../../../config/redis';
import { MEDIA_CLEANUP_QUEUE } from './mediaUpload.queue';
import { MediaUploadServices } from './mediaUpload.service';

interface MediaUploadJobData {}

interface MediaUploadJob extends Job<
  MediaUploadJobData,
  void,
  'delete-junk-media'
> {}

export const initMediaUploadWorker = () => {
  const worker = new Worker<MediaUploadJobData, void, 'delete-junk-media'>(
    MEDIA_CLEANUP_QUEUE,
    async (job: MediaUploadJob) => {
      if (job.name === 'delete-junk-media') {
        await MediaUploadServices.deleteJunkMediaFiles();
      }
    },
    { connection: redis },
  );

  worker.on('completed', (job: MediaUploadJob) => {
    console.log(`[BullMQ] Media cleanup job completed: id-${job.id}`);
  });

  worker.on('failed', (job: MediaUploadJob | undefined, err: Error) => {
    console.error(`[BullMQ] Media cleanup job failed: id-${job?.id}`, err);
  });

  worker.on('error', (err: Error) => {
    console.error('[BullMQ] Media cleanup worker error:', err);
  });

  return worker;
};

import { Job, Worker } from 'bullmq';
import { redis } from '../config/redis';
import { errorLogger } from '../shared/logger';
import { ISendEmail } from '../types/email';
import { emailHelper } from './emailHelper';
import { EMAIL_QUEUE, EmailQueueJob } from './email.queue';

export const initEmailWorker = () => {
  const worker = new Worker<ISendEmail>(
    EMAIL_QUEUE,
    async (job: Job<ISendEmail>) => {
      if (job.name !== EmailQueueJob.SendEmail) return;
      await emailHelper.sendEmail(job.data);
    },
    { connection: redis },
  );

  worker.on('failed', (job, error) => {
    errorLogger.error(`Email job failed: id-${job?.id}`, error);
  });

  return worker;
};

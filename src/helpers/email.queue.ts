import { Queue } from 'bullmq';
import { redis } from '../config/redis';
import { ISendEmail } from '../types/email';

export const EMAIL_QUEUE = 'email-queue';

export const EmailQueueJob = {
  SendEmail: 'send-email',
} as const;

const emailQueue = new Queue(EMAIL_QUEUE, {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: {
      count: 100,
      age: 24 * 3600,
    },
    removeOnFail: {
      count: 500,
      age: 7 * 24 * 3600,
    },
  },
});

const enqueueEmail = (payload: ISendEmail) => {
  return emailQueue.add(EmailQueueJob.SendEmail, payload, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  });
};

export const EmailQueue = {
  enqueueEmail,
};

import { describe, expect, it, vi } from 'vitest';
import { User } from '../../src/app/modules/user/user.model';
import { UserRole } from '../../src/app/modules/user/user.constant';
import { Notification } from '../../src/app/modules/notification/notification.model';
import { NotificationType } from '../../src/app/modules/notification/notification.constant';
import { initNotificationWorker } from '../../src/app/modules/notification/notification.worker';
import { initMediaUploadWorker } from '../../src/app/modules/mediaUpload/mediaUpload.worker';
import { harness } from '../harness';
import { createTestUser } from '../helpers/user.helper';

describe('BullMQ workers', () => {
  it('sends a notification to each active user', async () => {
    await createTestUser({
      email: 'notify@example.com',
      role: UserRole.Client,
    });

    harness().workerProcessors.length = 0;
    initNotificationWorker();
    const processor = harness().workerProcessors.at(-1);
    expect(processor).toBeTypeOf('function');

    const updateProgress = vi.fn().mockResolvedValue(undefined);
    const result = await processor!({
      id: 'job-1',
      data: {
        query: {},
        payload: {
          type: NotificationType.AccountUpdated,
          title: 'Hello',
          message: 'From the worker',
          referenceId: '',
        },
      },
      updateProgress,
    });

    expect(result).toEqual({ totalSent: 1 });
    expect(updateProgress).toHaveBeenCalled();
    const saved = await Notification.findOne({ title: 'Hello' });
    expect(saved?.receiver).toBeDefined();
    expect(await User.countDocuments({ email: 'notify@example.com' })).toBe(1);
  });

  it('runs the media cleanup processor without calling S3 when nothing expired', async () => {
    harness().redisMock.zrangebyscore.mockResolvedValueOnce([]);
    harness().workerProcessors.length = 0;
    initMediaUploadWorker();
    const processor = harness().workerProcessors.at(-1);

    await expect(
      processor!({ id: 'job-2', name: 'delete-junk-media', data: {} }),
    ).resolves.toBeUndefined();
    expect(harness().redisMock.zrangebyscore).toHaveBeenCalled();
  });
});

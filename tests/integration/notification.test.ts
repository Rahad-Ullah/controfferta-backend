import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../../src/app';
import { Notification } from '../../src/app/modules/notification/notification.model';
import { NotificationType } from '../../src/app/modules/notification/notification.constant';
import { authHeader } from '../helpers/auth.helper';
import { createTestUser } from '../helpers/user.helper';

describe('Notification API', () => {
  it('lists a user notifications and marks them read', async () => {
    const { user, token } = await createTestUser();
    const note = await Notification.create({
      type: NotificationType.AccountUpdated,
      title: 'Welcome',
      message: 'Your account is ready',
      receiver: user._id,
    });

    const list = await request(app)
      .get('/api/v1/notifications/me')
      .set('Authorization', authHeader(token));
    expect(list.status).toBe(200);
    expect(list.body.data.unreadCount).toBe(1);

    const one = await request(app)
      .patch(`/api/v1/notifications/read/${note._id}`)
      .set('Authorization', authHeader(token));
    expect(one.status).toBe(200);
    expect(one.body.data.isRead).toBe(true);

    await Notification.create({
      type: NotificationType.PolicyUpdated,
      title: 'Policy',
      message: 'Please review',
      receiver: user._id,
    });

    const all = await request(app)
      .patch('/api/v1/notifications/read-all')
      .set('Authorization', authHeader(token));
    expect(all.status).toBe(200);

    const unread = await Notification.countDocuments({
      receiver: user._id,
      isRead: false,
    });
    expect(unread).toBe(0);
  });
});

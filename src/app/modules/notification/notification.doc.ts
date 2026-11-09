import { z } from '../../../api-docs/zod';
import { registerApiRoute } from '../../../helpers/openapi-helper';
import { NotificationValidation } from './notification.validation';

const listQuery = z
  .object({
    page: z.string().optional(),
    limit: z.string().optional(),
  })
  .strict();

export function registerNotificationDocs() {
  const registerNotification = (
    opts: Parameters<typeof registerApiRoute>[0],
  ) => {
    registerApiRoute({ tags: ['Notification'], ...opts });
  };

  registerNotification({
    method: 'get',
    path: '/notifications/me',
    summary: 'Get my notifications',
    query: listQuery,
    isAuth: true,
  });

  registerNotification({
    method: 'patch',
    path: '/notifications/read/:id',
    summary: 'Mark a notification as read',
    params: NotificationValidation.readNotificationSchema.shape.params,
    isAuth: true,
  });

  registerNotification({
    method: 'patch',
    path: '/notifications/read-all',
    summary: 'Mark all notifications as read',
    isAuth: true,
  });
}

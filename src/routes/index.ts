import express from 'express';
import { AuthRoutes } from '../app/modules/auth/auth.route';
import { UserRoutes } from '../app/modules/user/user.route';
import { notificationRoutes } from '../app/modules/notification/notification.route';
import { disclaimerRoutes } from '../app/modules/disclaimer/disclaimer.route';
import { settingRoutes } from '../app/modules/setting/setting.route';
import { transactionRoutes } from '../app/modules/transaction/transaction.route';
import { adminRoutes } from '../app/modules/admin/admin.route';
import { walletRoutes } from '../app/modules/wallet/wallet.route';
import { ChatRoutes } from '../app/modules/chat/chat.route';
import { MessageRoutes } from '../app/modules/message/message.route';
import { supportRoutes } from '../app/modules/support/support.route';
import { faqRoutes } from '../app/modules/faq/faq.route';
import { categoryRoutes } from '../app/modules/category/category.route';
import { leadRoutes } from '../app/modules/lead/lead.route';
import { mediaUploadRoutes } from '../app/modules/mediaUpload/mediaUpload.route';
const router = express.Router();

const apiRoutes: { path: string; route: any }[] = [
  {
    path: '/users',
    route: UserRoutes,
  },
  {
    path: '/admins',
    route: adminRoutes,
  },
  {
    path: '/auth',
    route: AuthRoutes,
  },
  {
    path: '/media-uploads',
    route: mediaUploadRoutes,
  },
  {
    path: '/chats',
    route: ChatRoutes,
  },
  {
    path: '/messages',
    route: MessageRoutes,
  },
  {
    path: '/transactions',
    route: transactionRoutes,
  },
  {
    path: '/wallets',
    route: walletRoutes,
  },
  {
    path: '/notifications',
    route: notificationRoutes,
  },
  {
    path: '/supports',
    route: supportRoutes,
  },
  {
    path: '/faqs',
    route: faqRoutes,
  },
  {
    path: '/categories',
    route: categoryRoutes,
  },
  {
    path: '/leads',
    route: leadRoutes,
  },
  {
    path: '/disclaimers',
    route: disclaimerRoutes,
  },
  {
    path: '/settings',
    route: settingRoutes,
  },
];

apiRoutes.forEach(route => router.use(route.path, route.route));

export default router;

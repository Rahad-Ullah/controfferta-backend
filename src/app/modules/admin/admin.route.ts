import express from 'express';
import { AdminController } from './admin.controller';
import validateRequest from '../../middlewares/validateRequest';
import { AdminValidations } from './admin.validation';
import auth from '../../middlewares/auth';
import { UserRole } from '../user/user.constant';

const router = express.Router();

// create admin
router.post(
  '/create',
  auth(UserRole.SuperAdmin),
  validateRequest(AdminValidations.createAdminZodSchema),
  AdminController.createAdmin,
);

// update admin
router.patch(
  '/:id',
  auth(UserRole.SuperAdmin),
  validateRequest(AdminValidations.updateAdminZodSchema),
  AdminController.updateAdmin,
);

export const adminRoutes = router;
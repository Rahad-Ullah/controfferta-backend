import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { UserRole } from '../user/user.constant';
import { SupportController } from './support.controller';
import { SupportValidations } from './support.validation';

const router = express.Router();

// create support message
router.post(
  '/create',
  validateRequest(SupportValidations.createSupportValidation),
  SupportController.createSupportController,
);

// update support message
router.patch(
  '/:id',
  auth(UserRole.Admin, UserRole.SuperAdmin),
  validateRequest(SupportValidations.updateSupportValidation),
  SupportController.updateSupportController,
);

// delete support message
router.delete(
  '/:id',
  auth(UserRole.Admin, UserRole.SuperAdmin),
  validateRequest(SupportValidations.supportIdValidation),
  SupportController.deleteSupportController,
);

// get support messages
router.get(
  '/all',
  auth(UserRole.Admin, UserRole.SuperAdmin),
  validateRequest(SupportValidations.getSupportsValidation),
  SupportController.getSupportsController,
);

// get support message by id
router.get(
  '/:id',
  auth(UserRole.Admin, UserRole.SuperAdmin),
  validateRequest(SupportValidations.supportIdValidation),
  SupportController.getSupportByIdController,
);

export const supportRoutes = router;

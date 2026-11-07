import express from 'express';
import { SupportController } from './support.controller';
import auth from '../../middlewares/auth';
import { UserRole } from '../user/user.constant';
import validateRequest from '../../middlewares/validateRequest';
import { SupportValidations } from './support.validation';

const router = express.Router();

// create support ticket
router.post(
  '/create',
  auth(UserRole.Client, UserRole.Provider),
  validateRequest(SupportValidations.createSupportSchema),
  SupportController.createSupport,
);

// update support ticket
router.patch(
  '/:id',
  auth(UserRole.Admin, UserRole.SuperAdmin),
  validateRequest(SupportValidations.updateSupportSchema),
  SupportController.updateSupport
)

// get single support ticket
router.get(
  '/single/:id',
  auth(UserRole.Client, UserRole.Provider, UserRole.Admin, UserRole.SuperAdmin),
  validateRequest(SupportValidations.getSingleSupportSchema),
  SupportController.getSingleById,
);

// get by user id
router.get(
  '/my-tickets',
  auth(UserRole.Client, UserRole.Provider),
  SupportController.getByUserId,
);

// get all support tickets
router.get(
  '/',
  auth(UserRole.Admin, UserRole.SuperAdmin),
  SupportController.getAllSupports
)

export const supportRoutes = router;
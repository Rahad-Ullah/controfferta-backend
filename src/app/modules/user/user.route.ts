import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { UserController } from './user.controller';
import { UserValidation } from './user.validation';
import { UserRole } from './user.constant';
const router = express.Router();

// create user
router.post(
  '/register',
  validateRequest(UserValidation.createUserZodSchema),
  UserController.createUser,
);

// update profile
router.patch(
  '/me',
  auth(),
  validateRequest(UserValidation.updateUserZodSchema),
  UserController.updateProfile,
);

// update user status
router.patch(
  '/:id/status',
  auth(UserRole.Admin, UserRole.SuperAdmin),
  validateRequest(UserValidation.updateStatusZodSchema),
  UserController.updateStatus,
);

// delete user
router.delete(
  '/:id',
  auth(UserRole.Admin, UserRole.SuperAdmin),
  validateRequest(UserValidation.deleteUserZodSchema),
  UserController.deleteSingleUser,
);

// get profile
router.get('/me', auth(), UserController.getUserProfile);

// get single user
router.get(
  '/single/:id',
  auth(),
  validateRequest(UserValidation.getSingleUserZodSchema),
  UserController.getSingleUser,
);

// get all users
router.get(
  '/all',
  auth(UserRole.Admin, UserRole.SuperAdmin),
  validateRequest(UserValidation.getAllUsersZodSchema),
  UserController.getAllUsers,
);

export const UserRoutes = router;

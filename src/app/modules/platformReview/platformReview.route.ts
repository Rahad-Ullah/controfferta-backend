import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { UserRole } from '../user/user.constant';
import { PlatformReviewController } from './platformReview.controller';
import { PlatformReviewValidations } from './platformReview.validation';

const router = express.Router();

// create platform review
router.post(
  '/create',
  auth(UserRole.Client, UserRole.Provider),
  validateRequest(PlatformReviewValidations.createPlatformReviewValidation),
  PlatformReviewController.createPlatformReviewController,
);

// update platform review status
router.patch(
  '/:id/status',
  auth(UserRole.Admin, UserRole.SuperAdmin),
  validateRequest(
    PlatformReviewValidations.updatePlatformReviewStatusValidation,
  ),
  PlatformReviewController.updatePlatformReviewStatusController,
);

// delete platform review
router.delete(
  '/:id',
  auth(UserRole.Admin, UserRole.SuperAdmin),
  validateRequest(PlatformReviewValidations.platformReviewIdValidation),
  PlatformReviewController.deletePlatformReviewController,
);

// get all platform reviews
router.get(
  '/all',
  auth(UserRole.Admin, UserRole.SuperAdmin),
  validateRequest(PlatformReviewValidations.getAllPlatformReviewsValidation),
  PlatformReviewController.getAllPlatformReviewsController,
);

// get my platform reviews
router.get(
  '/me',
  auth(UserRole.Client, UserRole.Provider),
  validateRequest(PlatformReviewValidations.getPlatformReviewsValidation),
  PlatformReviewController.getMyPlatformReviewsController,
);

// get platform review by id
router.get(
  '/:id',
  validateRequest(PlatformReviewValidations.platformReviewIdValidation),
  PlatformReviewController.getPlatformReviewByIdController,
);

// get published platform reviews
router.get(
  '/',
  validateRequest(PlatformReviewValidations.getPlatformReviewsValidation),
  PlatformReviewController.getPlatformReviewsController,
);

export const platformReviewRoutes = router;

import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { UserRole } from '../user/user.constant';
import { CreditPackageController } from './creditPackage.controller';
import { CreditPackageValidations } from './creditPackage.validation';

const router = express.Router();

// create credit package
router.post(
  '/create',
  auth(UserRole.Admin, UserRole.SuperAdmin),
  validateRequest(CreditPackageValidations.createCreditPackageValidation),
  CreditPackageController.createCreditPackageController,
);

// update credit package
router.patch(
  '/:id',
  auth(UserRole.Admin, UserRole.SuperAdmin),
  validateRequest(CreditPackageValidations.updateCreditPackageValidation),
  CreditPackageController.updateCreditPackageController,
);

// delete credit package
router.delete(
  '/:id',
  auth(UserRole.Admin, UserRole.SuperAdmin),
  validateRequest(CreditPackageValidations.creditPackageIdValidation),
  CreditPackageController.deleteCreditPackageController,
);

// get all credit packages
router.get(
  '/all',
  auth(UserRole.Admin, UserRole.SuperAdmin),
  validateRequest(CreditPackageValidations.getAllCreditPackagesValidation),
  CreditPackageController.getAllCreditPackagesController,
);

// get credit package by id
router.get(
  '/:id',
  validateRequest(CreditPackageValidations.creditPackageIdValidation),
  CreditPackageController.getCreditPackageByIdController,
);

// get active credit packages
router.get(
  '/',
  validateRequest(CreditPackageValidations.getCreditPackagesValidation),
  CreditPackageController.getCreditPackagesController,
);

export const creditPackageRoutes = router;

import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { UserRole } from '../user/user.constant';
import { CreditPurchaseController } from './creditPurchase.controller';
import { CreditPurchaseValidations } from './creditPurchase.validation';

const router = express.Router();

// create credit purchase
router.post(
  '/create',
  auth(UserRole.Provider),
  validateRequest(CreditPurchaseValidations.createCreditPurchaseValidation),
  CreditPurchaseController.createCreditPurchaseController,
);

// get all credit purchases
router.get(
  '/all',
  auth(UserRole.Admin, UserRole.SuperAdmin),
  validateRequest(CreditPurchaseValidations.getCreditPurchasesValidation),
  CreditPurchaseController.getAllCreditPurchasesController,
);

// get credit purchase by id
router.get(
  '/:id',
  auth(UserRole.Provider, UserRole.Admin, UserRole.SuperAdmin),
  validateRequest(CreditPurchaseValidations.creditPurchaseIdValidation),
  CreditPurchaseController.getCreditPurchaseByIdController,
);

// get my credit purchases
router.get(
  '/',
  auth(UserRole.Provider),
  validateRequest(CreditPurchaseValidations.getCreditPurchasesValidation),
  CreditPurchaseController.getMyCreditPurchasesController,
);

export const creditPurchaseRoutes = router;

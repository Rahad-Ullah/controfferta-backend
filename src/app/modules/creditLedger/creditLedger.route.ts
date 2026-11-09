import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { UserRole } from '../user/user.constant';
import { CreditLedgerController } from './creditLedger.controller';
import { CreditLedgerValidations } from './creditLedger.validation';

const router = express.Router();

// adjust credit ledger
router.post(
  '/adjust',
  auth(UserRole.Admin, UserRole.SuperAdmin),
  validateRequest(CreditLedgerValidations.adjustCreditLedgerValidation),
  CreditLedgerController.adjustCreditLedgerController,
);

// get all credit ledger
router.get(
  '/all',
  auth(UserRole.Admin, UserRole.SuperAdmin),
  validateRequest(CreditLedgerValidations.getCreditLedgersValidation),
  CreditLedgerController.getAllCreditLedgerController,
);

// get credit ledger by id
router.get(
  '/:id',
  auth(UserRole.Provider, UserRole.Admin, UserRole.SuperAdmin),
  validateRequest(CreditLedgerValidations.creditLedgerIdValidation),
  CreditLedgerController.getCreditLedgerByIdController,
);

// get my credit ledger
router.get(
  '/',
  auth(UserRole.Provider),
  validateRequest(CreditLedgerValidations.getCreditLedgersValidation),
  CreditLedgerController.getMyCreditLedgerController,
);

export const creditLedgerRoutes = router;

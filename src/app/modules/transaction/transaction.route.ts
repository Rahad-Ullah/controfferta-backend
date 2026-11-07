import express from 'express';
import { TransactionController } from './transaction.controller';
import auth from '../../middlewares/auth';
import { UserRole } from '../user/user.constant';
import validateRequest from '../../middlewares/validateRequest';
import { TransactionValidations } from './transaction.validation';

const router = express.Router();

// update transaction status
router.patch(
    '/:id',
    auth(UserRole.Admin, UserRole.SuperAdmin),
    validateRequest(TransactionValidations.updateTransactionStatusValidation),
    TransactionController.updateTransactionStatus,
);

// get single transaction
router.get(
    '/single/:id',
    auth(),
    validateRequest(TransactionValidations.getSingleTransactionValidation),
    TransactionController.getSingleTransaction,
);

// get my transactions
router.get(
    '/me',
    auth(UserRole.Client, UserRole.Provider),
    TransactionController.getMyTransactions,
);

// get all transactions
router.get(
    '/all',
    auth(UserRole.Admin, UserRole.SuperAdmin),
    TransactionController.getAllTransactions,
);

export const transactionRoutes = router;

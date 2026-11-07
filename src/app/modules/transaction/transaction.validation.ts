import { z } from 'zod';
import { objectId } from '../../../shared/objectIdValidator';
import { TransactionStatus } from './transaction.constants';

// update transaction status validation
const updateTransactionStatusValidation = z.object({
  params: z.object({
    id: objectId('Transaction'),
  }).strict(),
  body: z.object({
    status: z.enum([TransactionStatus.Completed, TransactionStatus.Failed, TransactionStatus.Cancelled]),
  }).strict()
});

// get single transaction validation
const getSingleTransactionValidation = z.object({
  params: z.object({
    id: objectId('Transaction'),
  }).strict()
});

export const TransactionValidations = {
  updateTransactionStatusValidation,
  getSingleTransactionValidation,
};
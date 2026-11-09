import { z } from 'zod';
import { objectId } from '../../../shared/objectIdValidator';
import { CreditLedgerType } from './creditLedger.constant';

const listQuery = {
  searchTerm: z.string().optional(),
  type: z.nativeEnum(CreditLedgerType).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  sort: z.string().optional(),
};

const adjustCreditLedgerValidation = z.object({
  body: z
    .object({
      provider: objectId('provider id'),
      amount: z
        .number({ required_error: 'Amount is required' })
        .int('Amount must be a whole number')
        .refine(value => value !== 0, 'Amount cannot be zero'),
      note: z
        .string({ required_error: 'Note is required' })
        .trim()
        .min(1, 'Note is required'),
    })
    .strict(),
});

const creditLedgerIdValidation = z.object({
  params: z
    .object({
      id: objectId('credit ledger id'),
    })
    .strict(),
});

const getCreditLedgersValidation = z.object({
  query: z.object(listQuery).strict(),
});

export const CreditLedgerValidations = {
  adjustCreditLedgerValidation,
  creditLedgerIdValidation,
  getCreditLedgersValidation,
};

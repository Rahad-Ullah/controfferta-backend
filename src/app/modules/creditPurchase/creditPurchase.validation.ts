import { z } from 'zod';
import { objectId } from '../../../shared/objectIdValidator';
import { CreditPaymentStatus } from './creditPurchase.constant';

const listQuery = {
  searchTerm: z.string().optional(),
  paymentStatus: z.nativeEnum(CreditPaymentStatus).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  sort: z.string().optional(),
};

const createCreditPurchaseValidation = z.object({
  body: z
    .object({
      package: objectId('credit package id'),
    })
    .strict(),
});

const creditPurchaseIdValidation = z.object({
  params: z
    .object({
      id: objectId('credit purchase id'),
    })
    .strict(),
});

const getCreditPurchasesValidation = z.object({
  query: z.object(listQuery).strict(),
});

export const CreditPurchaseValidations = {
  createCreditPurchaseValidation,
  creditPurchaseIdValidation,
  getCreditPurchasesValidation,
};

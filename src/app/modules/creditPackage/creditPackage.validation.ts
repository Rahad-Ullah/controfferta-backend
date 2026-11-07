import { z } from 'zod';
import { objectId } from '../../../shared/objectIdValidator';
import {
  MINIMUM_PACKAGE_PRICE,
  CreditPackageStatus,
  CreditPackageTag,
} from './creditPackage.constant';

const name = z
  .string({ required_error: 'Name is required' })
  .trim()
  .min(1, 'Name is required');

const description = z
  .string({ required_error: 'Description is required' })
  .trim()
  .min(1, 'Description is required');

const creditsAmount = z
  .number({ required_error: 'Credits are required' })
  .int('Credits must be a whole number')
  .positive('Credits must be at least 1');

const price = z
  .number({ required_error: 'Price is required' })
  .int('Price must be a whole number of cents')
  .min(MINIMUM_PACKAGE_PRICE, 'Price must be at least 50 cents');

const tag = z.nativeEnum(CreditPackageTag).nullable();
const status = z.nativeEnum(CreditPackageStatus);

const listQuery = {
  searchTerm: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  sort: z.string().optional(),
};

const createCreditPackageValidation = z.object({
  body: z
    .object({
      name,
      description,
      creditsAmount,
      price,
      tag: tag.optional(),
      status: status.optional(),
    })
    .strict(),
});

const updateCreditPackageValidation = z.object({
  params: z
    .object({
      id: objectId('credit package id'),
    })
    .strict(),
  body: z
    .object({
      name: name.optional(),
      description: description.optional(),
      creditsAmount: creditsAmount.optional(),
      price: price.optional(),
      tag: tag.nullable().optional(),
      status: status.optional(),
    })
    .strict(),
});

const creditPackageIdValidation = z.object({
  params: z
    .object({
      id: objectId('credit package id'),
    })
    .strict(),
});

const getCreditPackagesValidation = z.object({
  query: z.object(listQuery).strict(),
});

const getAllCreditPackagesValidation = z.object({
  query: z
    .object({
      ...listQuery,
      status: status.optional(),
    })
    .strict(),
});

export const CreditPackageValidations = {
  createCreditPackageValidation,
  updateCreditPackageValidation,
  creditPackageIdValidation,
  getCreditPackagesValidation,
  getAllCreditPackagesValidation,
};

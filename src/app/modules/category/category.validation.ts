import { z } from 'zod';
import { objectId } from '../../../shared/objectIdValidator';

const iconUrl = z.union([z.string().url(), z.literal('')]).optional();

const creditCost = z
  .number({ required_error: 'Credit cost is required' })
  .int('Credit cost must be a whole number')
  .nonnegative('Credit cost cannot be negative');

const createCategoryValidation = z.object({
  body: z
    .object({
      name: z
        .string({ required_error: 'Name is required' })
        .trim()
        .min(1, 'Name is required'),
      description: z
        .string({ required_error: 'Description is required' })
        .trim()
        .min(1, 'Description is required'),
      iconUrl,
      creditCost,
    })
    .strict(),
});

const updateCategoryValidation = z.object({
  params: z
    .object({
      id: objectId('category id'),
    })
    .strict(),
  body: z
    .object({
      name: z.string().trim().min(1, 'Name is required').optional(),
      description: z
        .string()
        .trim()
        .min(1, 'Description is required')
        .optional(),
      iconUrl,
      creditCost: creditCost.optional(),
    })
    .strict(),
});

const categoryIdValidation = z.object({
  params: z
    .object({
      id: objectId('category id'),
    })
    .strict(),
});

const getAllCategoriesValidation = z.object({
  query: z
    .object({
      searchTerm: z.string().optional(),
      page: z.string().optional(),
      limit: z.string().optional(),
      sort: z.string().optional(),
    })
    .strict(),
});

export const CategoryValidations = {
  createCategoryValidation,
  updateCategoryValidation,
  categoryIdValidation,
  getAllCategoriesValidation,
};

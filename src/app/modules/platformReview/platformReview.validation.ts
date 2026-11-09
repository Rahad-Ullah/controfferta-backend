import { z } from 'zod';
import { objectId } from '../../../shared/objectIdValidator';
import { PlatformReviewStatus } from './platformReview.constant';

const listQuery = {
  searchTerm: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  sort: z.string().optional(),
};

const rating = z
  .number({ required_error: 'Rating is required' })
  .int('Rating must be a whole number')
  .min(1, 'Rating must be at least 1')
  .max(5, 'Rating must be at most 5');

const message = z
  .string({ required_error: 'Message is required' })
  .trim()
  .min(1, 'Message is required');

const createPlatformReviewValidation = z.object({
  body: z
    .object({
      rating,
      message,
    })
    .strict(),
});

const updatePlatformReviewStatusValidation = z.object({
  params: z
    .object({
      id: objectId('platform review id'),
    })
    .strict(),
  body: z
    .object({
      status: z.nativeEnum(PlatformReviewStatus, {
        required_error: 'Status is required',
      }),
    })
    .strict(),
});

const platformReviewIdValidation = z.object({
  params: z
    .object({
      id: objectId('platform review id'),
    })
    .strict(),
});

const getPlatformReviewsValidation = z.object({
  query: z.object(listQuery).strict(),
});

const getAllPlatformReviewsValidation = z.object({
  query: z
    .object({
      ...listQuery,
      status: z.nativeEnum(PlatformReviewStatus).optional(),
    })
    .strict(),
});

export const PlatformReviewValidations = {
  createPlatformReviewValidation,
  updatePlatformReviewStatusValidation,
  platformReviewIdValidation,
  getPlatformReviewsValidation,
  getAllPlatformReviewsValidation,
};

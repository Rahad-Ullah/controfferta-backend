import { z } from 'zod';
import { objectId } from '../../../shared/objectIdValidator';
import { SupportPriority, SupportStatus } from './support.constants';

const firstName = z
  .string({ required_error: 'First name is required' })
  .trim()
  .min(1, 'First name is required');

const lastName = z
  .string({ required_error: 'Last name is required' })
  .trim()
  .min(1, 'Last name is required');

const email = z
  .string({ required_error: 'Email is required' })
  .trim()
  .email('Invalid email address');

const subject = z
  .string({ required_error: 'Subject is required' })
  .trim()
  .min(1, 'Subject is required');

const message = z
  .string({ required_error: 'Message is required' })
  .trim()
  .min(1, 'Message is required');

const listQuery = {
  searchTerm: z.string().optional(),
  status: z.nativeEnum(SupportStatus).optional(),
  priority: z.nativeEnum(SupportPriority).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  sort: z.string().optional(),
};

const createSupportValidation = z.object({
  body: z
    .object({
      firstName,
      lastName,
      email,
      subject,
      message,
    })
    .strict(),
});

const updateSupportValidation = z.object({
  params: z
    .object({
      id: objectId('support id'),
    })
    .strict(),
  body: z
    .object({
      status: z.nativeEnum(SupportStatus).optional(),
      priority: z.nativeEnum(SupportPriority).optional(),
    })
    .strict(),
});

const supportIdValidation = z.object({
  params: z
    .object({
      id: objectId('support id'),
    })
    .strict(),
});

const getSupportsValidation = z.object({
  query: z.object(listQuery).strict(),
});

export const SupportValidations = {
  createSupportValidation,
  updateSupportValidation,
  supportIdValidation,
  getSupportsValidation,
};

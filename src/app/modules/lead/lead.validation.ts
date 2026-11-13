import { z } from 'zod';
import { objectId } from '../../../shared/objectIdValidator';
import { LeadStatus } from './lead.constant';

const optionalObjectId = (fieldName: string) =>
  z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, `${fieldName} must be a valid object id`)
    .optional();

const dateString = z
  .string()
  .refine(value => !Number.isNaN(Date.parse(value)), 'Invalid date');

const searchTerm = z.string().trim().max(100, 'Search term is too long').optional();

const pageLimit = z
  .string()
  .regex(/^\d+$/, 'Limit must be a whole number')
  .refine(value => Number(value) >= 1, 'Limit must be at least 1')
  .refine(value => Number(value) <= 60, 'Limit cannot be greater than 60')
  .optional();

const sortQuery = (allowed: readonly string[]) =>
  z
    .string()
    .refine(value => {
      return value.split(',').every(part => {
        const field = part.startsWith('-') ? part.slice(1) : part;
        return allowed.includes(field);
      });
    }, 'Sort field is not allowed')
    .optional();

const feedSortFields = [
  'createdAt',
  'updatedAt',
  'title',
  'address',
  'timeline',
  'budgetRange.minimum',
  'budgetRange.maximum',
] as const;

const adminSortFields = [
  ...feedSortFields,
  'status',
  'uid',
  'client.name',
  'client.email',
] as const;

const createLeadValidation = z.object({
  body: z
    .object({
      category: objectId('category'),
      title: z
        .string({ error: 'Title is required' })
        .trim()
        .min(1, 'Title is required'),
      description: z
        .string({ error: 'Description is required' })
        .trim()
        .min(1, 'Description is required'),
      address: z
        .string({ error: 'Address is required' })
        .trim()
        .min(1, 'Address is required'),
      location: z
        .object({
          type: z.literal('Point').optional(),
          coordinates: z.tuple([
            z.number().min(-180).max(180),
            z.number().min(-90).max(90),
          ]),
        })
        .optional(),
      budgetRange: z
        .object({
          minimum: z.number({ error: 'Minimum budget is required' }),
          maximum: z.number({ error: 'Maximum budget is required' }),
        })
        .refine(range => range.minimum <= range.maximum, {
          message: 'Minimum budget cannot be greater than the maximum',
          path: ['minimum'],
        }),
      timeline: z
        .string({ error: 'Timeline is required' })
        .trim()
        .min(1, 'Timeline is required'),
      client: z.object({
        name: z
          .string({ error: 'Client name is required' })
          .trim()
          .min(1, 'Client name is required'),
        email: z
          .string({ error: 'Client email is required' })
          .email('Invalid email address'),
        phone: z.object({
          countryCode: z
            .string({ error: 'Country code is required' })
            .trim()
            .min(1)
            .max(5),
          number: z
            .string({ error: 'Phone number is required' })
            .trim()
            .min(1, 'Phone number is required'),
        }),
        address: z
          .string({ error: 'Client address is required' })
          .trim()
          .min(1, 'Client address is required'),
      }),
    })
    .strict(),
});

const updateLeadStatusValidation = z.object({
  params: z
    .object({
      id: objectId('lead id'),
    })
    .strict(),
  body: z
    .object({
      status: z.nativeEnum(LeadStatus, {
        error: 'Status is required',
      }),
    })
    .strict(),
});

const leadIdValidation = z.object({
  params: z
    .object({
      id: objectId('lead id'),
    })
    .strict(),
});

const leadFeedValidation = z.object({
  query: z
    .object({
      searchTerm,
      category: optionalObjectId('category'),
      from: dateString.optional(),
      to: dateString.optional(),
      page: z.string().optional(),
      limit: pageLimit,
      sort: sortQuery(feedSortFields),
    })
    .strict(),
});

const getAllLeadsValidation = z.object({
  query: z
    .object({
      searchTerm,
      category: optionalObjectId('category'),
      status: z.nativeEnum(LeadStatus).optional(),
      page: z.string().optional(),
      limit: pageLimit,
      sort: sortQuery(adminSortFields),
    })
    .strict(),
});

export const LeadValidations = {
  createLeadValidation,
  updateLeadStatusValidation,
  leadIdValidation,
  leadFeedValidation,
  getAllLeadsValidation,
};

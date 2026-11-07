import { z } from 'zod';
import { SupportStatus, SupportType } from './support.constants';
import { objectId } from '../../../shared/objectIdValidator';

// create support ticket
const createSupportSchema = z.object({
  body: z.object({
    type: z.nativeEnum(SupportType, {
      required_error: 'Support type is required',
    }),
    title: z.string({
      required_error: 'Title is required',
    }).min(1, {
      message: 'Title must be at least 1 character long',
    }).max(200, {
      message: 'Title must be at most 200 characters long',
    }),
    message: z.string({
      required_error: 'Message is required',
    }).min(10, {
      message: 'Message must be at least 10 characters long',
    }),
    phone: z.string().optional().or(z.literal(null)).or(z.literal(''))
  }).strict()
})

// update support ticket status
const updateSupportSchema = z.object({
  params: z.object({
    id: objectId('Support ID')
  }).strict(),
  body: z.object({
    status: z.enum([SupportStatus.InProgress, SupportStatus.Resolved, SupportStatus.Closed]).optional(),
  }).strict()
})

// get single support ticket
const getSingleSupportSchema = z.object({
  params: z.object({
    id: objectId('Support ID')
  }).strict()
})

export const SupportValidations = {
  createSupportSchema,
  updateSupportSchema,
  getSingleSupportSchema,
};
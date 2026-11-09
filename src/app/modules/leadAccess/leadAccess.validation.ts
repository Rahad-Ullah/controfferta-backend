import { z } from 'zod';
import { objectId } from '../../../shared/objectIdValidator';
import { LeadAccessStatus } from './leadAccess.constant';

const listQuery = {
  status: z.nativeEnum(LeadAccessStatus).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  sort: z.string().optional(),
};

const unlockLeadValidation = z.object({
  body: z
    .object({
      lead: objectId('lead id'),
    })
    .strict(),
});

const updateLeadAccessStatusValidation = z.object({
  params: z
    .object({
      id: objectId('lead access id'),
    })
    .strict(),
  body: z
    .object({
      status: z.nativeEnum(LeadAccessStatus, {
        required_error: 'Status is required',
      }),
    })
    .strict(),
});

const leadAccessIdValidation = z.object({
  params: z
    .object({
      id: objectId('lead access id'),
    })
    .strict(),
});

const getLeadAccessesValidation = z.object({
  query: z.object(listQuery).strict(),
});

export const LeadAccessValidations = {
  unlockLeadValidation,
  updateLeadAccessStatusValidation,
  leadAccessIdValidation,
  getLeadAccessesValidation,
};

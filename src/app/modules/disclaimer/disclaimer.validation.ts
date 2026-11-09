import { z } from 'zod';
import { DisclaimerType } from './disclaimer.constants';

const type = z.nativeEnum(DisclaimerType, {
  required_error: 'Disclaimer type is required',
});

const content = z
  .string({ required_error: 'Disclaimer content is required' })
  .trim()
  .min(1, 'Disclaimer content is required');

const createUpdateDisclaimerSchema = z.object({
  body: z
    .object({
      type,
      content,
    })
    .strict(),
});

const getDisclaimerSchema = z.object({
  params: z
    .object({
      type,
    })
    .strict(),
});

export const DisclaimerValidations = {
  createUpdateDisclaimerSchema,
  getDisclaimerSchema,
};

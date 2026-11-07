import { z } from 'zod';
import { DisclaimerType } from './disclaimer.constants';

// -------------- create/update disclaimer ----------------
const createUpdateDisclaimerSchema = z.object({
  body: z
    .object({
      type: z.nativeEnum(DisclaimerType, {
        required_error: 'Disclaimer type is required',
      }),
      content: z.string({
        required_error: 'Disclaimer content is required',
      }),
    })
    .strict(),
});

// -------------- get disclaimer ----------------
const getDisclaimerSchema = z.object({
  params: z
    .object({
      type: z.nativeEnum(DisclaimerType, {
        required_error: 'Disclaimer type is required',
      }),
    })
    .strict(),
});

export const DisclaimerValidations = {
  createUpdateDisclaimerSchema,
  getDisclaimerSchema,
};

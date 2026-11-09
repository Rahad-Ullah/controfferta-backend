import { z } from 'zod';

const text = z.string().trim();
const email = z.union([z.string().trim().email(), z.literal('')]);
const url = z.union([z.string().trim().url(), z.literal('')]);

const address = z
  .object({
    line1: text.optional(),
    line2: text.optional(),
    city: text.optional(),
    state: text.optional(),
    postalCode: text.optional(),
    country: text.optional(),
  })
  .strict();

const location = z
  .object({
    type: z.literal('Point').default('Point'),
    coordinates: z.tuple([
      z.number().min(-180).max(180),
      z.number().min(-90).max(90),
    ]),
  })
  .strict();

const socialLinks = z
  .object({
    facebook: url.optional(),
    instagram: url.optional(),
    twitter: url.optional(),
    linkedin: url.optional(),
    youtube: url.optional(),
    tiktok: url.optional(),
    reddit: url.optional(),
    weChat: url.optional(),
    discord: url.optional(),
    telegram: url.optional(),
  })
  .strict();

const updateSettingValidation = z.object({
  body: z
    .object({
      welcomeCreditAmount: z
        .number()
        .int('Welcome credits must be a whole number')
        .min(0, 'Welcome credits cannot be negative')
        .optional(),
      contactInfo: z
        .object({
          email: email.optional(),
          phone: text.optional(),
          whatsApp: text.optional(),
          address: address.optional(),
          location: location.optional(),
        })
        .strict()
        .optional(),
      socialLinks: socialLinks.optional(),
    })
    .strict(),
});

export const SettingValidations = {
  updateSettingValidation,
};

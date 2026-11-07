import { z } from 'zod';

// update setting validation
const updateSettingValidation = z.object({
  body: z
    .object({
      contactInfo: z
        .object({
          email: z.string().email().optional(),
          phone: z
            .object({
              countryCode: z.string().optional(),
              number: z.string().optional(),
            })
            .optional(),
          whatsApp: z
            .object({
              countryCode: z.string().optional(),
              number: z.string().optional(),
            })
            .optional(),
          address: z.string().optional(),
          location: z
            .object({
              type: z.enum(['Point']).default('Point').optional(),
              coordinates: z.array(z.number()).optional(),
            })
            .optional(),
        })
        .strict()
        .optional(),
      mobileAppLink: z
        .object({
          googlePlay: z.string().url().or(z.literal('')).optional(),
          appleStore: z.string().url().or(z.literal('')).optional(),
        })
        .strict()
        .optional(),
      socialLink: z
        .object({
          facebook: z.string().url().or(z.literal('')).optional(),
          instagram: z.string().url().or(z.literal('')).optional(),
          twitter: z.string().url().or(z.literal('')).optional(),
          linkedin: z.string().url().or(z.literal('')).optional(),
          youtube: z.string().url().or(z.literal('')).optional(),
          tiktok: z.string().url().or(z.literal('')).optional(),
          reddit: z.string().url().or(z.literal('')).optional(),
          weChat: z.string().url().or(z.literal('')).optional(),
          discord: z.string().url().or(z.literal('')).optional(),
          telegram: z.string().url().or(z.literal('')).optional(),
        })
        .strict()
        .optional(),
    })
    .strict(),
});

export const SettingValidations = {
  updateSettingValidation,
};
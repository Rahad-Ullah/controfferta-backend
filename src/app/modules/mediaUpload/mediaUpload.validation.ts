import { z } from 'zod';

// upload media
const uploadMedia = z.object({
  body: z.object({
    image: z.any().optional(),
    media: z.any().optional(),
    doc: z.any().optional(),
  }),
});

export const MediaUploadValidations = {
  uploadMedia,
};

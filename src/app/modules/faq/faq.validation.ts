import { z } from 'zod';
import { objectId } from '../../../shared/objectIdValidator';

// create validation schema for faq
export const createFaqValidation = z.object({
  body: z.object({
    question: z.string().nonempty('Question is required'),
    answer: z.string().nonempty('Answer is required'),
  })
});

// update validation schema for faq
export const updateFaqValidation = z.object({
  body: z.object({
    question: z.string().nonempty('Question is required').optional(),
    answer: z.string().nonempty('Answer is required').optional(),
  }),
  params: z.object({
    id: objectId('ID'),
  })
});

// delete validation schema for faq
export const deleteFaqValidation = z.object({
  params: z.object({
    id: objectId('ID'),
  })
});

// get by id validation schema for faq
export const getFaqByIdValidation = z.object({
  params: z.object({
    id: objectId('ID'),
  })
});

export const FaqValidations = {
  createFaqValidation,
  updateFaqValidation,
  deleteFaqValidation,
  getFaqByIdValidation,
};
import { z } from 'zod';
import { objectId } from '../../../shared/objectIdValidator';

// create chat validation
export const createChatValidation = z.object({
  body: z
    .object({
      participants: z
        .array(objectId('Participant ID'))
        .min(1, 'Minimum 1 participants are required'),
    })
    .strict(),
});

// delete chat validation
export const deleteChatValidation = z.object({
  params: z
    .object({
      id: objectId('Chat ID'),
    })
    .strict(),
});

// get single chat validation
export const getSingleChatValidation = z.object({
  params: z
    .object({
      id: objectId('Chat ID'),
    })
    .strict(),
});

// get my chats validation
export const getMyChatsValidation = z.object({
  query: z
    .object({
      page: z.number().optional(),
      limit: z.number().optional(),
      search: z.string().optional(),
    })
    .strict(),
});

export const ChatValidations = {
  createChatValidation,
  deleteChatValidation,
  getSingleChatValidation,
  getMyChatsValidation,
};

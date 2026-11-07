import express from 'express';
import { ChatController } from './chat.controller';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { ChatValidations } from './chat.validation';

const router = express.Router();

// create chat
router.post(
  '/create',
  auth(),
  validateRequest(ChatValidations.createChatValidation),
  ChatController.createChat
);

// delete chat
router.delete(
  '/:id',
  auth(),
  validateRequest(ChatValidations.deleteChatValidation),
  ChatController.deleteChat
);

// get single chat
router.get(
  '/single/:id',
  auth(),
  validateRequest(ChatValidations.getSingleChatValidation),
  ChatController.getSingleChat
);

// get my chats
router.get('/me', auth(), ChatController.getMyChats);

export const ChatRoutes = router;

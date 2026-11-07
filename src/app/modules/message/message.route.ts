import express from 'express';
import { MessageController } from './message.controller';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { MessageValidations } from './message.validation';
import fileUploadHandler from '../../middlewares/fileUploadHandler';

const router = express.Router();

// create message
router.post(
  '/create',
  auth(),
  fileUploadHandler(),
  validateRequest(MessageValidations.createMessageSchema),
  MessageController.createMessage
);

// get messages by chat id
router.get(
  '/chat/:chatId',
  auth(),
  validateRequest(MessageValidations.getChatMessagesSchema),
  MessageController.getChatMessages
);

export const MessageRoutes = router;

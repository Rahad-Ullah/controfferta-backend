import { Request, Response, NextFunction } from 'express';
import { ChatServices } from './chat.service';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';

// create chat
const createChat = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const result = await ChatServices.createChatIntoDB(req.user, req.body);

    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: 'Chat created successfully',
      data: result,
    });
  }
);

// delete chat
const deleteChat = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const result = await ChatServices.deleteChatFromDB(req.params.id);

    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: 'Chat created successfully',
      data: result,
    });
  }
);

// get single chat
const getSingleChat = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const result = await ChatServices.getSingleChatFromDB(req.params.id, req.user.id);

    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: 'Chat retrieved successfully',
      data: result,
    });
  }
);

// getMy chat
const getMyChats = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const result = await ChatServices.getMyChatsFromDB(req.user, req.query);

    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: 'Chats retrieved successfully',
      data: result,
    });
  }
);

export const ChatController = {
  createChat,
  deleteChat,
  getSingleChat,
  getMyChats,
};

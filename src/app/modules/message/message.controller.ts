import { Request, Response, NextFunction } from 'express';
import { MessageServices } from './message.service';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { getSingleFilePath } from '../../../shared/getFilePath';
import { MessageType } from './message.constant';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';

// ----------------- create message -------------------
const createMessage = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const payload = { ...req.body, sender: req.user.id };

    // validation for message content
    switch (payload.type) {
      case MessageType.Text:
        if (!payload.text || payload.text.trim() === '') {
          return next(
            new ApiError(StatusCodes.BAD_REQUEST, 'Text message is required'),
          );
        }
        payload.content = payload.text.trim();
        delete payload.text;
        break;
      case MessageType.Image:
        const imagePath = getSingleFilePath(req.files, 'image');
        if (!imagePath) {
          return next(
            new ApiError(StatusCodes.BAD_REQUEST, 'Image is required'),
          );
        }
        payload.content = imagePath;
        delete payload.image;
        break;
      case MessageType.Media:
        const mediaPath = getSingleFilePath(req.files, 'media');
        if (!mediaPath) {
          return next(
            new ApiError(StatusCodes.BAD_REQUEST, 'Media is required'),
          );
        }
        payload.content = mediaPath;
        delete payload.media;
        break;
      case MessageType.Document:
        const docPath = getSingleFilePath(req.files, 'doc');
        if (!docPath) {
          return next(
            new ApiError(StatusCodes.BAD_REQUEST, 'Document is required'),
          );
        }
        payload.content = docPath;
        delete payload.doc;
        break;
    }

    const result = await MessageServices.createMessage(payload);

    sendResponse(res, {
      success: true,
      statusCode: 201,
      message: 'Message created successfully',
      data: result,
    });
  }
);

// ----------------- get messages by chat id -------------------
const getChatMessages = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const chatId = req.params.chatId;
    const user = req.user;

    const result = await MessageServices.getChatMessages(
      chatId,
      req.query,
      user
    );

    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: 'Messages retrieved successfully',
      data: result.messages,
      pagination: result.pagination,
    });
  }
);

export const MessageController = { createMessage, getChatMessages };

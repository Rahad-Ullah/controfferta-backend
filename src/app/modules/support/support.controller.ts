import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { SupportServices } from './support.service';

// create support message
const createSupportController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await SupportServices.createSupportService(req.body);

    sendResponse(res, {
      statusCode: StatusCodes.CREATED,
      success: true,
      message: 'Support message sent successfully',
      data: result,
    });
  },
);

// update support message
const updateSupportController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await SupportServices.updateSupportService(
      req.params.id,
      req.body,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Support message updated successfully',
      data: result,
    });
  },
);

// delete support message
const deleteSupportController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await SupportServices.deleteSupportService(req.params.id);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Support message deleted successfully',
      data: result,
    });
  },
);

// get support message by id
const getSupportByIdController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await SupportServices.getSupportByIdService(req.params.id);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Support message fetched successfully',
      data: result,
    });
  },
);

// get support messages
const getSupportsController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await SupportServices.getSupportsService(req.query);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Support messages fetched successfully',
      data: result.data,
      pagination: result.pagination,
    });
  },
);

export const SupportController = {
  createSupportController,
  updateSupportController,
  deleteSupportController,
  getSupportByIdController,
  getSupportsController,
};

import { Request, Response } from 'express';
import { FaqServices } from './faq.service';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';

// create faq
const createFaqController = catchAsync(async (req: Request, res: Response) => {
  const result = await FaqServices.createFaqService(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'FAQ created successfully',
    data: result,
  });
});

// update faq
const updateFaqController = catchAsync(async (req: Request, res: Response) => {
  const result = await FaqServices.updateFaqService(req.params.id as string, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'FAQ updated successfully',
    data: result,
  });
});

// delete faq
const deleteFaqController = catchAsync(async (req: Request, res: Response) => {
  const result = await FaqServices.deleteFaqService(req.params.id as string);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'FAQ deleted successfully',
    data: result,
  });
});

// get faq by id
const getFaqByIdController = catchAsync(async (req: Request, res: Response) => {
  const result = await FaqServices.getFaqByIdService(req.params.id as string);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'FAQ fetched successfully',
    data: result,
  });
});

// get all faqs
const getAllFaqsController = catchAsync(async (req: Request, res: Response) => {
  const result = await FaqServices.getAllFaqsService();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'FAQs fetched successfully',
    data: result,
  });
});

export const FaqController = {
  createFaqController,
  updateFaqController,
  deleteFaqController,
  getFaqByIdController,
  getAllFaqsController,
};
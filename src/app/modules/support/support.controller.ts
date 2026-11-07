import { Request, Response, NextFunction } from 'express';
import { SupportServices } from './support.service';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';

// create support ticket
const createSupport = catchAsync(async (req: Request, res: Response) => {
  const result = await SupportServices.createSupport({ user: req.user.id, ...req.body });

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Support ticket created successfully",
    data: result,
  });
})

// update support
const updateSupport = catchAsync(async (req: Request, res: Response) => {
  const result = await SupportServices.updateSupport(req.params.id, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Support ticket updated successfully",
    data: result,
  });
})

// get single support
const getSingleById = catchAsync(async (req: Request, res: Response) => {
  const result = await SupportServices.getSingleById(req.params.id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Support ticket fetched successfully",
    data: result,
  });
})

// get by user id
const getByUserId = catchAsync(async (req: Request, res: Response) => {
  const result = await SupportServices.getByUserId(req.user.id, req.query);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Support tickets fetched successfully",
    data: result.data,
    pagination: result.pagination
  });
})

// get all supports
const getAllSupports = catchAsync(async (req: Request, res: Response) => {
  const result = await SupportServices.getAllSupports(req.query);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Support tickets fetched successfully",
    data: result.data,
    pagination: result.pagination
  });
})

export const SupportController = {
  createSupport,
  updateSupport,
  getSingleById,
  getByUserId,
  getAllSupports
};
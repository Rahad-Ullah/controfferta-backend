import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { CreditPurchaseServices } from './creditPurchase.service';

// create credit purchase
const createCreditPurchaseController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await CreditPurchaseServices.createCreditPurchaseService(
      req.user,
      req.body.package,
    );

    sendResponse(res, {
      statusCode: StatusCodes.CREATED,
      success: true,
      message: 'Credit purchase started successfully',
      data: result,
    });
  },
);

// get credit purchase by id
const getCreditPurchaseByIdController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await CreditPurchaseServices.getCreditPurchaseByIdService(
      req.params.id,
      req.user,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Credit purchase fetched successfully',
      data: result,
    });
  },
);

// get my credit purchases
const getMyCreditPurchasesController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await CreditPurchaseServices.getMyCreditPurchasesService(
      req.user.id,
      req.query,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Credit purchases fetched successfully',
      data: result.data,
      pagination: result.pagination,
    });
  },
);

// get all credit purchases
const getAllCreditPurchasesController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await CreditPurchaseServices.getAllCreditPurchasesService(
      req.query,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Credit purchases fetched successfully',
      data: result.data,
      pagination: result.pagination,
    });
  },
);

export const CreditPurchaseController = {
  createCreditPurchaseController,
  getCreditPurchaseByIdController,
  getMyCreditPurchasesController,
  getAllCreditPurchasesController,
};

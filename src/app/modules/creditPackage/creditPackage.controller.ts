import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { CreditPackageServices } from './creditPackage.service';

// create credit package
const createCreditPackageController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await CreditPackageServices.createCreditPackageService(
      req.body,
    );

    sendResponse(res, {
      statusCode: StatusCodes.CREATED,
      success: true,
      message: 'Credit package created successfully',
      data: result,
    });
  },
);

// update credit package
const updateCreditPackageController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await CreditPackageServices.updateCreditPackageService(
      req.params.id,
      req.body,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Credit package updated successfully',
      data: result,
    });
  },
);

// delete credit package
const deleteCreditPackageController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await CreditPackageServices.deleteCreditPackageService(
      req.params.id,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Credit package deleted successfully',
      data: result,
    });
  },
);

// get credit package by id
const getCreditPackageByIdController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await CreditPackageServices.getCreditPackageByIdService(
      req.params.id,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Credit package fetched successfully',
      data: result,
    });
  },
);

// get active credit packages
const getCreditPackagesController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await CreditPackageServices.getCreditPackagesService(
      req.query,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Credit packages fetched successfully',
      data: result.data,
      pagination: result.pagination,
    });
  },
);

// get all credit packages
const getAllCreditPackagesController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await CreditPackageServices.getAllCreditPackagesService(
      req.query,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Credit packages fetched successfully',
      data: result.data,
      pagination: result.pagination,
    });
  },
);

export const CreditPackageController = {
  createCreditPackageController,
  updateCreditPackageController,
  deleteCreditPackageController,
  getCreditPackageByIdController,
  getCreditPackagesController,
  getAllCreditPackagesController,
};

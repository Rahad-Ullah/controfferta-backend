import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { PlatformReviewServices } from './platformReview.service';

// create platform review
const createPlatformReviewController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await PlatformReviewServices.createPlatformReviewService(
      req.user,
      req.body,
    );

    sendResponse(res, {
      statusCode: StatusCodes.CREATED,
      success: true,
      message: 'Platform review submitted successfully',
      data: result,
    });
  },
);

// update platform review status
const updatePlatformReviewStatusController = catchAsync(
  async (req: Request, res: Response) => {
    const result =
      await PlatformReviewServices.updatePlatformReviewStatusService(
        req.params.id,
        req.body.status,
      );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Platform review status updated successfully',
      data: result,
    });
  },
);

// delete platform review
const deletePlatformReviewController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await PlatformReviewServices.deletePlatformReviewService(
      req.params.id,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Platform review deleted successfully',
      data: result,
    });
  },
);

// get platform review by id
const getPlatformReviewByIdController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await PlatformReviewServices.getPlatformReviewByIdService(
      req.params.id,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Platform review fetched successfully',
      data: result,
    });
  },
);

// get my platform reviews
const getMyPlatformReviewsController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await PlatformReviewServices.getMyPlatformReviewsService(
      req.user.id,
      req.query,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Platform reviews fetched successfully',
      data: result.data,
      pagination: result.pagination,
    });
  },
);

// get published platform reviews
const getPlatformReviewsController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await PlatformReviewServices.getPlatformReviewsService(
      req.query,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Platform reviews fetched successfully',
      data: result.data,
      pagination: result.pagination,
    });
  },
);

// get all platform reviews
const getAllPlatformReviewsController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await PlatformReviewServices.getAllPlatformReviewsService(
      req.query,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Platform reviews fetched successfully',
      data: result.data,
      pagination: result.pagination,
    });
  },
);

export const PlatformReviewController = {
  createPlatformReviewController,
  updatePlatformReviewStatusController,
  deletePlatformReviewController,
  getPlatformReviewByIdController,
  getMyPlatformReviewsController,
  getPlatformReviewsController,
  getAllPlatformReviewsController,
};

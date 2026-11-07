import { Request, Response, NextFunction } from 'express';
import { DisclaimerServices } from './disclaimer.service';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';
import { DisclaimerType } from './disclaimer.constants';

// -------------- create/update disclaimer ----------------
const createOrUpdateDisclaimer = catchAsync(
  async (req: Request, res: Response) => {
    const result = await DisclaimerServices.createOrUpdateDisclaimer(req.body);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Disclaimer updated successfully',
      data: result,
    });
  }
);

// -------------- get disclaimer by type ----------------
const getDisclaimerByType = catchAsync(
  async (req: Request, res: Response) => {
    const result = await DisclaimerServices.getDisclaimerByType(req.params.type as DisclaimerType);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Disclaimer fetched successfully',
      data: result,
    });
  }
);

export const DisclaimerController = {
  createOrUpdateDisclaimer,
  getDisclaimerByType,
};
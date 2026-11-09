import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { DisclaimerType } from './disclaimer.constants';
import { DisclaimerServices } from './disclaimer.service';

// create or update disclaimer
const createOrUpdateDisclaimer = catchAsync(
  async (req: Request, res: Response) => {
    const result = await DisclaimerServices.createOrUpdateDisclaimer(req.body);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Disclaimer updated successfully',
      data: result,
    });
  },
);

// get disclaimer by type
const getDisclaimerByType = catchAsync(async (req: Request, res: Response) => {
  const result = await DisclaimerServices.getDisclaimerByType(
    req.params.type as DisclaimerType,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Disclaimer fetched successfully',
    data: result,
  });
});

export const DisclaimerController = {
  createOrUpdateDisclaimer,
  getDisclaimerByType,
};

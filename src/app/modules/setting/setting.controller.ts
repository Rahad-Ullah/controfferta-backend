import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { SettingServices } from './setting.service';

// create or update setting
const createOrUpdateSetting = catchAsync(
  async (req: Request, res: Response) => {
    const result = await SettingServices.createOrUpdateSetting(req.body);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Setting updated successfully',
      data: result,
    });
  },
);

// get setting
const getSetting = catchAsync(async (req: Request, res: Response) => {
  const result = await SettingServices.getSetting();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Setting fetched successfully',
    data: result,
  });
});

export const SettingController = {
  createOrUpdateSetting,
  getSetting,
};

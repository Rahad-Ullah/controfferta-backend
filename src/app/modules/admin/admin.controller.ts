import { Request, Response } from 'express';
import { AdminServices } from './admin.service';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';

// create admin
const createAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminServices.createAdmin(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Admin created successfully',
    data: result,
  });
});

// update admin
const updateAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminServices.updateAdmin(
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Admin updated successfully',
    data: result,
  });
});

export const AdminController = {
  createAdmin,
  updateAdmin,
};

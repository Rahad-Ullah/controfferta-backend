import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { LeadAccessServices } from './leadAccess.service';

// unlock lead
const unlockLeadController = catchAsync(async (req: Request, res: Response) => {
  const result = await LeadAccessServices.unlockLeadService(
    req.user,
    req.body.lead,
  );

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Lead unlocked successfully',
    data: result,
  });
});

// update lead access status
const updateLeadAccessStatusController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await LeadAccessServices.updateLeadAccessStatusService(
      req.params.id,
      req.body.status,
      req.user,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Lead access status updated successfully',
      data: result,
    });
  },
);

// get lead access by id
const getLeadAccessByIdController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await LeadAccessServices.getLeadAccessByIdService(
      req.params.id,
      req.user,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Lead access fetched successfully',
      data: result,
    });
  },
);

// get my lead accesses
const getMyLeadAccessesController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await LeadAccessServices.getMyLeadAccessesService(
      req.user.id,
      req.query,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Lead accesses fetched successfully',
      data: result.data,
      pagination: result.pagination,
    });
  },
);

// get all lead accesses
const getAllLeadAccessesController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await LeadAccessServices.getAllLeadAccessesService(
      req.query,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Lead accesses fetched successfully',
      data: result.data,
      pagination: result.pagination,
    });
  },
);

export const LeadAccessController = {
  unlockLeadController,
  updateLeadAccessStatusController,
  getLeadAccessByIdController,
  getMyLeadAccessesController,
  getAllLeadAccessesController,
};

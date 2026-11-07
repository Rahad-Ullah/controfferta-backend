import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { LeadServices } from './lead.service';

// create lead
const createLeadController = catchAsync(async (req: Request, res: Response) => {
  const result = await LeadServices.createLeadService(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Lead submitted successfully',
    data: result,
  });
});

// update lead status
const updateLeadStatusController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await LeadServices.updateLeadStatusService(
      req.params.id,
      req.body.status,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Lead status updated successfully',
      data: result,
    });
  },
);

// delete lead
const deleteLeadController = catchAsync(async (req: Request, res: Response) => {
  const result = await LeadServices.deleteLeadService(req.params.id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Lead deleted successfully',
    data: result,
  });
});

// get lead by id
const getLeadByIdController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await LeadServices.getLeadByIdService(
      req.params.id,
      req.user,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Lead fetched successfully',
      data: result,
    });
  },
);

// get lead feed
const getLeadFeedController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await LeadServices.getLeadFeedService(req.query);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Leads fetched successfully',
      data: result.data,
      pagination: result.pagination,
    });
  },
);

// get all leads
const getAllLeadsController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await LeadServices.getAllLeadsService(req.query);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Leads fetched successfully',
      data: result.data,
      pagination: result.pagination,
    });
  },
);

export const LeadController = {
  createLeadController,
  updateLeadStatusController,
  deleteLeadController,
  getLeadByIdController,
  getLeadFeedController,
  getAllLeadsController,
};

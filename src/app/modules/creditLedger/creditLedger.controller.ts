import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { CreditLedgerServices } from './creditLedger.service';

// adjust credit ledger
const adjustCreditLedgerController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await CreditLedgerServices.adjustCreditLedgerService(
      req.user,
      req.body,
    );

    sendResponse(res, {
      statusCode: StatusCodes.CREATED,
      success: true,
      message: 'Credit adjustment recorded successfully',
      data: result,
    });
  },
);

// get credit ledger by id
const getCreditLedgerByIdController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await CreditLedgerServices.getCreditLedgerByIdService(
      req.params.id,
      req.user,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Credit ledger fetched successfully',
      data: result,
    });
  },
);

// get my credit ledger
const getMyCreditLedgerController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await CreditLedgerServices.getMyCreditLedgerService(
      req.user.id,
      req.query,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Credit ledger fetched successfully',
      data: result.data,
      pagination: result.pagination,
    });
  },
);

// get all credit ledger
const getAllCreditLedgerController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await CreditLedgerServices.getAllCreditLedgerService(
      req.query,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Credit ledger fetched successfully',
      data: result.data,
      pagination: result.pagination,
    });
  },
);

export const CreditLedgerController = {
  adjustCreditLedgerController,
  getCreditLedgerByIdController,
  getMyCreditLedgerController,
  getAllCreditLedgerController,
};

import { Request, Response } from 'express';
import { TransactionServices } from './transaction.service';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';

// update transaction status
const updateTransactionStatus = catchAsync(
  async (req: Request, res: Response) => {
    const result = await TransactionServices.updateTransactionStatus(
      req.params.id as string,
      req.body,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Transaction status updated successfully',
      data: result,
    });
  },
);

// get single transaction
const getSingleTransaction = catchAsync(async (req: Request, res: Response) => {
  const result = await TransactionServices.getSingleTransaction(
    req.params.id as string,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Transaction fetched successfully',
    data: result,
  });
});

// get my transactions
const getMyTransactions = catchAsync(async (req: Request, res: Response) => {
  const result = await TransactionServices.getTransactionsByUserId(
    req.user.id as string,
    req.query,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Transactions fetched successfully',
    data: result.data,
    pagination: result.pagination,
  });
});

// get all transactions
const getAllTransactions = catchAsync(async (req: Request, res: Response) => {
  const result = await TransactionServices.getAllTransactions(req.query);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Transactions fetched successfully',
    data: result.data,
    pagination: result.pagination,
  });
});

export const TransactionController = {
  updateTransactionStatus,
  getSingleTransaction,
  getMyTransactions,
  getAllTransactions,
};

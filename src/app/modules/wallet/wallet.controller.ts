import { Request, Response } from 'express';
import { WalletServices } from './wallet.service';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';
import { PayoutProvider } from './wallet.constants';

// connect payout method controller
const connectPayoutMethod = catchAsync(async (req: Request, res: Response) => {
  const result = await WalletServices.connectPayoutMethodService({
    ...req.body,
    user: req.user.id,
    provider: PayoutProvider.Stripe,
  });

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Payout method connected successfully',
    data: result,
  });
});

// payout withdrawal
const payoutWithdrawal = catchAsync(async (req: Request, res: Response) => {
  const result = await WalletServices.payoutMoneyService(
    req.user.id,
    req.body.amount,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Withdrawal initiated successfully',
    data: result,
  });
});

// get my wallet
const getMyWallet = catchAsync(async (req: Request, res: Response) => {
  const result = await WalletServices.getWalletByUserIdService(
    req.user.id as string,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Wallet fetched successfully',
    data: result,
  });
});

export const WalletController = {
  connectPayoutMethod,
  payoutWithdrawal,
  getMyWallet,
};

import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import {
  PayoutProvider,
  SupportedCurrency,
  WalletStatus,
} from './wallet.constants';
import { IWallet } from './wallet.interface';
import { Wallet } from './wallet.model';
import { stripe } from '../../../config/stripe';
import config from '../../../config';
import { Transaction } from '../transaction/transaction.model';
import {
  TransactionReferenceType,
  TransactionType,
} from '../transaction/transaction.constants';
import { emailTemplate } from '../../../shared/emailTemplate';
import { emailHelper } from '../../../helpers/emailHelper';
import { logger } from '../../../shared/logger';

// --------------- connect payout method service ---------------
const connectPayoutMethodService = async (payload: IWallet) => {
  const { user, provider } = payload;
  let onboardingUrl: string | null = null;

  const existingWallet = await Wallet.findOne({ user });

  // STRIPE CONNECT FLOW
  if (provider === PayoutProvider.Stripe) {
    let stripeAccountId =
      existingWallet?.gatewayBankInfo?.[PayoutProvider.Stripe]?.stripeAccountId;

    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        capabilities: { transfers: { requested: true } },
        metadata: { userId: user.toString() },
      });
      stripeAccountId = account.id;
    }

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      type: 'account_onboarding',
      refresh_url: `${config.frontend_url}/wallet/onboarding`,
      return_url: `${config.frontend_url}/wallet/success`,
    });

    onboardingUrl = accountLink.url;

    payload.gatewayBankInfo = {
      ...payload.gatewayBankInfo,
      [PayoutProvider.Stripe]: { stripeAccountId },
    };
  }

  const providerBankData = payload.gatewayBankInfo?.[provider];
  const updateQuery: Record<string, any> = {
    provider,
    status: WalletStatus.PendingOnboarding,
  };

  if (providerBankData) {
    updateQuery[`gatewayBankInfo.${provider}`] = providerBankData;
  }

  let wallet;
  if (existingWallet) {
    wallet = await Wallet.findOneAndUpdate(
      { user },
      { $set: updateQuery },
      { new: true, runValidators: true },
    );
  } else {
    wallet = await Wallet.create(payload);
  }

  return { wallet, onboardingUrl };
};

// -------------- withdraw/payout service --------------
const payoutMoneyService = async (userId: string, amountUSD: number) => {
  // check if wallet exists
  const wallet = await Wallet.findOne({ user: userId });
  if (!wallet) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Wallet not found. Please connect your payout method.',
    );
  }

  // check if wallet is active
  if (wallet.status !== WalletStatus.Active) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Wallet is not active. Please connect your payout method.',
    );
  }

  // check if amount is greater than wallet available balance
  if (amountUSD > wallet.availableBalance) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Insufficient available balance',
    );
  }

  // check gateway provider and payout
  const txnId = `ZILA_PAYOUT-${wallet._id}-${Date.now()}`;
  if (wallet.provider === PayoutProvider.Stripe) {
    // check stripe balance
    const balance = await stripe.balance.retrieve();
    const availableBalance = balance.available.find(
      item => item.currency === wallet.currency,
    );
    if (availableBalance && availableBalance.amount < amountUSD) {
      // send notification to the admins
      const template = emailTemplate.lowBalanceWarning({
        adminEmail: config.super_admin.email as string,
        gatewayName: 'Stripe',
        currentBalance: availableBalance.amount,
        requiredBalance: amountUSD,
        currency: SupportedCurrency.Usd,
      });
      emailHelper.sendEmail(template).catch(err => {
        logger.error('Failed to send low balance email to admin:', err);
      });
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'We have insufficient available balance. Please try again later.',
      );
    }

    const bankInfo = wallet.gatewayBankInfo?.[PayoutProvider.Stripe];
    if (!bankInfo) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Stripe bank routing and account information is missing.',
      );
    }
    try {
      await stripe.transfers.create({
        amount: amountUSD,
        currency: wallet.currency,
        destination: bankInfo.stripeAccountId,
        metadata: { txnId, userId, walletId: wallet._id.toString() },
      });
    } catch (error) {
      console.error('Error on Stripe payout: ', error);
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Stripe Payout failed');
    }
  }

  // create transaction
  const transaction = await Transaction.create({
    user: userId,
    type: TransactionType.Payout,
    amount: amountUSD,
    reference: {
      type: TransactionReferenceType.Wallet,
      id: wallet._id,
    },
    gateway: wallet.provider,
    gatewayReferenceId: txnId,
  });

  return transaction;
};

// --------------- get wallet by user id service ---------------
const getWalletByUserIdService = async (userId: string) => {
  const result = await Wallet.findOne({ user: userId });
  return result;
};

export const WalletServices = {
  connectPayoutMethodService,
  payoutMoneyService,
  getWalletByUserIdService,
};

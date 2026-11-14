import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';
import type { Stripe } from 'stripe/types';
import ApiError from '../../../errors/ApiError';
import {
  CreditLedgerReferenceType,
  CreditLedgerType,
} from '../../modules/creditLedger/creditLedger.constant';
import { CreditLedgerServices } from '../../modules/creditLedger/creditLedger.service';
import { CREDIT_CURRENCY } from '../../modules/creditPackage/creditPackage.constant';
import { CreditPackage } from '../../modules/creditPackage/creditPackage.model';
import { CreditPaymentStatus } from '../../modules/creditPurchase/creditPurchase.constant';
import { CreditPurchase } from '../../modules/creditPurchase/creditPurchase.model';
import { TransactionStatus } from '../../modules/transaction/transaction.constants';
import { Transaction } from '../../modules/transaction/transaction.model';

type StripeFee = {
  gatewayFee: number;
  paymentIntentId: string;
  paymentMethod: string;
};

// ---------------- fulfill credit purchase ----------------
// fee is the Stripe balance-transaction fee, already in euros
const fulfillCreditPurchase = async (purchaseId: string, fee: StripeFee) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const purchase = await CreditPurchase.findOneAndUpdate(
      {
        _id: purchaseId,
        paymentStatus: CreditPaymentStatus.Unpaid,
      },
      { paymentStatus: CreditPaymentStatus.Paid },
      { new: true, session },
    );
    if (!purchase?.transaction) {
      await session.abortTransaction();
      return;
    }

    await Transaction.findByIdAndUpdate(
      purchase.transaction,
      {
        status: TransactionStatus.Completed,
        isPaid: true,
        paidAt: new Date(),
        gatewayFee: fee.gatewayFee,
        currency: CREDIT_CURRENCY,
        gatewayReferenceId: fee.paymentIntentId,
        paymentMethod: fee.paymentMethod,
      },
      { session },
    );

    await CreditPackage.updateOne(
      { _id: purchase.package },
      { $inc: { purchaseCount: 1 } },
      { session },
    );

    // the paid purchase and the credit grant commit together
    await CreditLedgerServices.postCreditLedger({
      providerId: purchase.provider.toString(),
      type: CreditLedgerType.Purchase,
      amount: purchase.creditsAmount,
      reference: {
        type: CreditLedgerReferenceType.CreditPurchase,
        id: purchase._id.toString(),
      },
      session,
    });

    await session.commitTransaction();
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    if (
      error instanceof ApiError &&
      error.statusCode === StatusCodes.CONFLICT
    ) {
      return;
    }
    throw error;
  } finally {
    session.endSession();
  }
};

// ---------------- fail credit purchase ----------------
const failCreditPurchase = async (
  session: Stripe.Checkout.Session,
  status: TransactionStatus.Failed | TransactionStatus.Cancelled,
) => {
  const purchaseId = session.metadata?.referenceId;
  if (!purchaseId) return;

  const purchase = await CreditPurchase.findById(purchaseId);
  if (!purchase || purchase.paymentStatus !== CreditPaymentStatus.Unpaid)
    return;
  if (!purchase.transaction) return;

  await Transaction.updateOne(
    { _id: purchase.transaction },
    { status, isPaid: false },
  );
};

// ---------------- refund credit purchase ----------------
// the paid purchase and the credit reversal commit together
const refundCreditPurchase = async (purchaseId: string) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const purchase = await CreditPurchase.findOneAndUpdate(
      {
        _id: purchaseId,
        paymentStatus: CreditPaymentStatus.Paid,
      },
      { paymentStatus: CreditPaymentStatus.Refunded },
      { new: true, session },
    );
    if (!purchase) {
      await session.abortTransaction();
      return;
    }

    await CreditPackage.updateOne(
      { _id: purchase.package },
      { $inc: { purchaseCount: -1 } },
      { session },
    );

    await CreditLedgerServices.postCreditLedger({
      providerId: purchase.provider.toString(),
      type: CreditLedgerType.Refund,
      amount: -purchase.creditsAmount,
      allowPartial: true,
      reference: {
        type: CreditLedgerReferenceType.CreditPurchase,
        id: purchase._id.toString(),
      },
      session,
    });

    await session.commitTransaction();
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    if (
      error instanceof ApiError &&
      error.statusCode === StatusCodes.CONFLICT
    ) {
      return;
    }
    throw error;
  } finally {
    session.endSession();
  }
};

export const StripeFulfillment = {
  fulfillCreditPurchase,
  failCreditPurchase,
  refundCreditPurchase,
};

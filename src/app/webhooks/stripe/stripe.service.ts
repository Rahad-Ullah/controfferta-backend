import type { Stripe } from 'stripe/types';
import { Transaction } from '../../modules/transaction/transaction.model';
import {
  TransactionGateway,
  TransactionReferenceType,
  TransactionStatus,
  TransactionType,
} from '../../modules/transaction/transaction.constants';
import { stripe } from '../../../config/stripe';
import {
  PayoutProvider,
  SupportedCurrency,
} from '../../modules/wallet/wallet.constants';
import { Wallet } from '../../modules/wallet/wallet.model';
import { sendNotifications } from '../../../helpers/notificationHelper';

// ----------------- on checkout session completed -----------------
const onCheckoutSessionCompleted = async (event: Stripe.Event) => {
  const session = event.data.object as Stripe.Checkout.Session;

  // 1. Extract custom metadata
  const { userId, referenceType, referenceId } = session.metadata || {};
  if (!userId || !referenceType || !referenceId) {
    console.error(
      `[Stripe Webhook Error] Missing crucial metadata for session: ${session.id}`,
    );
    return;
  }

  // 2. Capture the Stripe Payment Intent ID (Crucial for processing future refunds)
  const paymentIntentId = session.payment_intent as string;
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ['latest_charge.balance_transaction'],
  });
  const balanceTransaction = (paymentIntent.latest_charge as Stripe.Charge)
    ?.balance_transaction as Stripe.BalanceTransaction;

  // 3. Format financial data
  const totalAmount = balanceTransaction.amount / 100;
  const gatewayFee = balanceTransaction?.fee / 100 || 0;
  const platformFeePercentage = 0;
  const platformFee = (totalAmount * platformFeePercentage) / 100;
  const netAmount = totalAmount - platformFee;

  const isPaid = session.payment_status === 'paid';

  try {
    // 4. update the formal Transaction document inside your MongoDB ledger
    const transaction = await Transaction.findOneAndUpdate(
      {
        gateway: TransactionGateway.Stripe,
        gatewayReferenceId: session.id,
      },
      {
        user: userId,
        reference: {
          type: referenceType as TransactionReferenceType,
          id: referenceId,
        },
        type: TransactionType.Payment,
        gateway: TransactionGateway.Stripe,
        gatewayReferenceId: paymentIntentId,
        paymentMethod: session.payment_method_types?.[0] || 'card',
        amount: totalAmount,
        gatewayFee: gatewayFee,
        platformFeePercentage: platformFeePercentage,
        platformFee: platformFee,
        netAmount: netAmount,
        currency: session.currency?.toUpperCase() || 'USD',
        status: isPaid ? TransactionStatus.Completed : TransactionStatus.Failed,
        isPaid: isPaid,
        paidAt: isPaid ? new Date() : undefined,
      },
      { upsert: true, new: true },
    );

    console.log(
      `[Stripe Webhook Success] Transaction logged successfully: ${transaction._id}`,
    );

    // 5. Trigger Fulfiment Logic Below
    // todo: trigger fulfillment logic based on referenceType
  } catch (error: any) {
    console.error(
      `[Database Error] Failed to log transaction for session ${session.id}:`,
      error.message,
    );
    throw error;
  }
};

// ----------------- on async payment failed -----------------
const onAsyncPaymentFailed = async (event: Stripe.Event) => {
  const session = event.data.object as Stripe.Checkout.Session;
  const paymentIntentId = session.payment_intent as string;
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ['latest_charge.balance_transaction'],
  });
  const balanceTransaction = (paymentIntent.latest_charge as Stripe.Charge)
    ?.balance_transaction as Stripe.BalanceTransaction;
  const totalAmount = balanceTransaction.amount / 100;
  const gatewayFee = balanceTransaction?.fee / 100 || 0;
  const platformFeePercentage = 0;
  const platformFee = (totalAmount * platformFeePercentage) / 100;
  const netAmount = totalAmount - platformFee;

  // 1. Extract custom metadata
  const { userId, referenceType, referenceId } = session.metadata || {};
  if (!userId || !referenceType || !referenceId) {
    console.error(
      `[Stripe Webhook Error] Missing crucial metadata for session: ${session.id}`,
    );
    return;
  }

  try {
    // 2. Update or create the transaction document to mark it as Failed
    const transaction = await Transaction.findOneAndUpdate(
      {
        gateway: TransactionGateway.Stripe,
        gatewayReferenceId: paymentIntentId,
      },
      {
        $set: {
          user: userId,
          reference: {
            type: referenceType as TransactionReferenceType,
            id: referenceId,
          },
          type: TransactionType.Payment,
          gateway: TransactionGateway.Stripe,
          gatewayReferenceId: paymentIntentId,
          paymentMethod: session.payment_method_types?.[0] || 'card',
          amount: totalAmount,
          gatewayFee: gatewayFee,
          platformFeePercentage: platformFeePercentage,
          platformFee: platformFee,
          netAmount: netAmount,
          currency: session.currency?.toUpperCase() || 'USD',
          status: TransactionStatus.Failed,
          isPaid: false,
        },
      },
      { upsert: true, new: true },
    );

    console.log(
      `[Stripe Webhook Failure][${event.type}] Transaction ${transaction._id} marked as FAILED.`,
    );

    // 3. Reverse Fulfillment Logic (Release the held resource)
    // todo: reverse fulfillment logic
  } catch (error: any) {
    console.error(
      `[Database Error] Failed to process payment failure for intent ${paymentIntentId}:`,
      error.message,
    );
    throw error;
  }
};

// ----------------- on checkout session expired -----------------
const onCheckoutSessionExpired = async (event: Stripe.Event) => {
  const session = event.data.object as Stripe.Checkout.Session;
  const paymentIntentId = session.payment_intent as string;

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ['latest_charge.balance_transaction'],
  });
  const balanceTransaction = (paymentIntent.latest_charge as Stripe.Charge)
    ?.balance_transaction as Stripe.BalanceTransaction;
  const totalAmount = balanceTransaction.amount / 100;
  const gatewayFee = balanceTransaction?.fee / 100 || 0;
  const platformFeePercentage = 0;
  const platformFee = (totalAmount * platformFeePercentage) / 100;
  const netAmount = totalAmount - platformFee;

  // 1. Extract custom metadata
  const { userId, referenceType, referenceId } = session.metadata || {};
  if (!userId || !referenceType || !referenceId) {
    console.error(
      `[Stripe Webhook Error] Missing crucial metadata for session: ${session.id}`,
    );
    return;
  }

  try {
    // 2. Update or create the transaction document to mark it as Failed
    const transaction = await Transaction.findOneAndUpdate(
      {
        gateway: TransactionGateway.Stripe,
        gatewayReferenceId: paymentIntentId,
      },
      {
        $set: {
          user: userId,
          reference: {
            type: referenceType as TransactionReferenceType,
            id: referenceId,
          },
          type: TransactionType.Payment,
          gateway: TransactionGateway.Stripe,
          gatewayReferenceId: paymentIntentId,
          paymentMethod: session.payment_method_types?.[0] || 'card',
          amount: totalAmount,
          gatewayFee: gatewayFee,
          platformFeePercentage: platformFeePercentage,
          platformFee: platformFee,
          netAmount: netAmount,
          currency: session.currency?.toUpperCase() || 'USD',
          status: TransactionStatus.Cancelled,
          isPaid: false,
        },
      },
      { upsert: true, new: true },
    );

    console.log(
      `[Stripe Webhook Failure][${event.type}] Transaction ${transaction._id} marked as FAILED.`,
    );

    // 3. Reverse Fulfillment Logic (Release the held resource)
    // todo: reverse fulfillment logic
  } catch (error: any) {
    console.error(
      `[Database Error] Failed to process payment failure for intent ${paymentIntentId}:`,
      error.message,
    );
    throw error;
  }
};

// ----------------- on refund success -----------------
const onRefundSuccess = async (event: Stripe.Event) => {
  const charge = event.data.object as Stripe.Charge;
  const paymentIntentId = charge.payment_intent as string;

  const { userId, referenceType, transactionId } = charge.metadata || {};

  if (!paymentIntentId) {
    console.error(
      `[Stripe Webhook Error] Missing payment_intent in refund charge: ${charge.id}`,
    );
    return;
  }

  try {
    // 1. Find the original payment transaction
    const transaction = await Transaction.findById(transactionId);

    if (!transaction) {
      console.error(
        `[Stripe Webhook Error] Original transaction not found for payment_intent: ${paymentIntentId}`,
      );
      return;
    }

    // 2. Update the transaction status and refund fields
    const updatedTransaction = await Transaction.findByIdAndUpdate(
      transaction._id,
      {
        $set: {
          status: TransactionStatus.Completed,
          isPaid: true,
          paidAt: new Date(),
        },
      },
      { new: true },
    );

    // 3. Reverse Fulfillment Logic (Release the held resource)
    // todo: reverse fulfillment logic

    console.log(
      `[Stripe Webhook Success][${event.type}] Transaction ${transaction._id} marked as ${updatedTransaction?.status}. Total refunded: ${updatedTransaction?.amount}.`,
    );
  } catch (error: any) {
    console.error(
      `[Database Error] Failed to process refund success for payment_intent ${paymentIntentId}:`,
      error.message,
    );
    throw error;
  }
};

// ----------------- on refund failed -----------------
const onRefundFailed = async (event: Stripe.Event) => {
  // 1. The event object for refund failures is a Stripe.Refund
  const refund = event.data.object as Stripe.Refund;
  const paymentIntentId = refund.payment_intent as string;

  const { transactionId } = refund.metadata || {};

  if (!paymentIntentId) {
    console.error(
      `[Stripe Webhook Error] Missing payment_intent in failed refund: ${refund.id}`,
    );
    return;
  }

  // Reason why the refund failed (e.g., 'expired_or_canceled_card', 'insufficient_funds')
  const failureReason = refund.failure_reason || 'Unknown reason';

  try {
    // 2. Find the original payment transaction
    const transaction = await Transaction.exists({ _id: transactionId });

    if (!transaction) {
      console.error(
        `[Stripe Webhook Error] Original transaction not found for payment_intent: ${paymentIntentId}`,
      );
      return;
    }

    // 3. Update transaction status to reflect the refund failure
    await Transaction.findByIdAndUpdate(
      transaction._id,
      {
        $set: {
          status: TransactionStatus.Failed,
          isPaid: false,
        },
      },
      { new: true },
    );

    console.error(
      `[Stripe Webhook Alert][${event.type}] Refund ${refund.id} FAILED for transaction ${transaction._id}. Reason: ${failureReason}`,
    );

    // 4. Optionally: Alert admin to intervene manually

  } catch (error: any) {
    console.error(
      `[Database Error] Failed to process refund failure for payment_intent ${paymentIntentId}:`,
      error.message,
    );
    throw error;
  }
};

// ----------------- on account updated -----------------
const onAccountUpdated = async (event: Stripe.Event) => {
  const {
    id: stripeAccountId,
    details_submitted, // True if the host finished the Stripe Express onboarding form
    payouts_enabled,
    metadata,
    external_accounts,
  } = event.data.object as Stripe.Account;

  const { userId } = metadata || {};

  if (!userId) {
    console.error(
      `[Stripe Webhook Warning] 'account.updated' received without userId in metadata for account: ${stripeAccountId}`,
    );
    return;
  }

  try {
    // 1. Find the user's wallet record
    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      console.error(
        `[Stripe Webhook Error] No platform wallet found matching user: ${userId}`,
      );
      return;
    }

    // 2. Parse the user's active bank account or card information out of Stripe's payload
    let bankName = 'Stripe Connected Account';
    let accountNumberLast4 = '';
    let fundingType = 'bank_account';

    if (
      external_accounts &&
      external_accounts.data &&
      external_accounts.data.length > 0
    ) {
      const primaryAccount = external_accounts.data[0];

      fundingType = primaryAccount.object; // 'bank_account' or 'card'
      accountNumberLast4 = primaryAccount.last4 || '';

      if (primaryAccount.object === 'bank_account') {
        bankName = (primaryAccount as any).bank_name || 'Stripe Bank Account';
      } else if (primaryAccount.object === 'card') {
        bankName = (primaryAccount as any).brand || 'Stripe Debit Card';
      }
    }

    // 3. Build the up-to-date Stripe schema payload
    const updatedStripeInfo = {
      stripeAccountId,
      bankName,
      accountNumberLast4,
      fundingType,
      isOnboardingCompleted: details_submitted,
      payoutsEnabled: payouts_enabled,
    };

    // 4. Atomic update to merge this safely into gatewayBankInfo
    await Wallet.findByIdAndUpdate(wallet._id, {
      $set: {
        [`gatewayBankInfo.${PayoutProvider.Stripe}`]: updatedStripeInfo,
      },
    });

    console.log(
      `[Stripe Webhook Success] Synchronized onboarding status for User ${userId}. Setup Complete: ${details_submitted}`,
    );
  } catch (error: any) {
    console.error(
      `[Database Error] Failed to update onboarding status for Stripe Account ${stripeAccountId}:`,
      error.message,
    );
    throw error;
  }
};

// ----------------- on transfer created -----------------
const onTransferCreated = async (event: Stripe.Event) => {
  const { id, amount, metadata } = event.data.object as Stripe.Transfer;

  const { userId, walletId, txnId } = metadata || {};

  if (!walletId) {
    console.error(
      `[Stripe Webhook Error] Missing wallet metadata for transfer: ${id}`,
    );
    return;
  }

  // 1. Convert Stripe cents to platform USD float
  const totalAmountUSD = amount / 100;

  try {
    // 2. Log or finalize the payout transaction in your MongoDB ledger
    const transaction = await Transaction.findOneAndUpdate(
      {
        type: TransactionType.Payout,
        gateway: TransactionGateway.Stripe,
        gatewayReferenceId: txnId,
      },
      {
        user: userId,
        paymentMethod: 'stripe_connect',
        amount: totalAmountUSD,
        gatewayFee: 0, // Platform transfers don't levy individual fees; those hit during payout/charge
        platformFeePercentage: 0,
        platformFee: 0,
        netAmount: totalAmountUSD,
        currency: SupportedCurrency.Usd,
        status: TransactionStatus.Completed,
        isPaid: true,
        paidAt: new Date(),
      },
      { upsert: true, new: true },
    );

    console.log(
      `[Stripe Webhook Success] Connect Transfer logged: ${transaction._id}`,
    );

    // 3. Deduct the available balance now that the transfer cleared out of your platform
    await Wallet.findByIdAndUpdate(walletId, {
      $inc: {
        availableBalance: -totalAmountUSD,
      },
    });

    console.log(
      `[Fulfillment Success] Wallet ${walletId} balance debited successfully.`,
    );
  } catch (error: any) {
    console.error(
      `[Database Error] Failed to log Stripe Connect transfer for ${id}:`,
      error.message,
    );
    throw error;
  }
};

const onTransferReversed = async (event: Stripe.Event) => {
  const { id, amount, metadata } = event.data.object as Stripe.Transfer;

  const { walletId, txnId } = metadata || {};

  if (!walletId) {
    console.error(
      `[Stripe Webhook Error] Missing wallet metadata for reversal: ${id}`,
    );
    return;
  }

  const reversedAmountUSD = amount / 100;

  try {
    // Mark the ledger item as failed/reversed
    await Transaction.findOneAndUpdate(
      {
        type: TransactionType.Payout,
        gateway: TransactionGateway.Stripe,
        gatewayReferenceId: txnId,
      },
      {
        status: TransactionStatus.Failed,
        isPaid: false,
      },
    );

    // Refund the money back into the host's wallet since the transfer bounced back
    await Wallet.findByIdAndUpdate(walletId, {
      $inc: {
        availableBalance: reversedAmountUSD,
      },
    });

    console.log(
      `[Reversal Success] Wallet ${walletId} balance restored due to Stripe reversal.`,
    );
  } catch (error: any) {
    console.error(
      `[Database Error] Failed to reverse Stripe transfer for ${id}:`,
      error.message,
    );
    throw error;
  }
};

export const StripeWebhookServices = {
  onCheckoutSessionCompleted,
  onAsyncPaymentFailed,
  onCheckoutSessionExpired,
  onRefundSuccess,
  onRefundFailed,
  onAccountUpdated,
  onTransferCreated,
  onTransferReversed,
};

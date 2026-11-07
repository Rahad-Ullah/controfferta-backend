import { Transaction } from './transaction.model';
import { ITransaction } from './transaction.interface';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import {
  TransactionStatus,
  TransactionReferenceType,
  TransactionGateway,
} from './transaction.constants';
import config from '../../../config';
import QueryBuilder from '../../builder/QueryBuilder';
import { User } from '../user/user.model';
import { stripe } from '../../../config/stripe';
import { IUser } from '../user/user.interface';

// ------------- create Stripe checkout session ----------------
const createStripeCheckoutSession = async (
  user: IUser,
  payload: {
    amount: number;
    currency: string;
    reference: { type: TransactionReferenceType; id: string };
  },
) => {
  const { amount, currency, reference } = payload;

  if (!amount || !currency || !reference) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Amount, currency, and reference are required',
    );
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    payment_intent_data: {
      capture_method: 'automatic',
    },
    line_items: [
      {
        price_data: {
          currency: currency.toLowerCase(),
          product_data: {
            name: `Payment for ${reference.type}`,
          },
          unit_amount: Math.round(amount * 100), // amount is in cents
        },
        quantity: 1,
      },
    ],
    success_url: `${config.frontend_url}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.frontend_url}/payment/cancel`,
    client_reference_id: reference.id,
    customer_email: user.email,
    metadata: {
      userId: user._id.toString(),
      referenceType: reference.type,
      referenceId: reference.id,
    },
  });

  return {
    checkoutUrl: session.url,
    sessionId: session.id,
    gateway: TransactionGateway.Stripe,
  };
};

// ------------- refund stripe payment ----------------
const refundStripePayment = async ({
  paymentIntentId,
  amount,
  reason,
  metadata,
}: {
  paymentIntentId: string;
  amount: number;
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  metadata?: {
    userId: string;
    referenceType: TransactionReferenceType;
    referenceId: string;
    transactionId: string;
  };
}) => {
  try {
    const result = await stripe.refunds.create(
      {
        payment_intent: paymentIntentId,
        amount,
        reason,
        metadata,
      },
      {
        // Guarantees this specific refund is executed ONLY ONCE
        idempotencyKey: `refund_${paymentIntentId}_${amount}`,
      },
    );
    return result;
  } catch (error: any) {
    console.error('Stripe API Error on refund:', error);
    throw error;
  }
};

// ------------- update transaction status ----------------
const updateTransactionStatus = async (
  id: string,
  payload: Partial<ITransaction>,
) => {
  if (payload.status === TransactionStatus.Completed) {
    payload.isPaid = true;
    payload.paidAt = new Date();
  } else {
    payload.isPaid = false;
    payload.paidAt = undefined;
  }

  const result = await Transaction.findByIdAndUpdate(id, payload, {
    new: true,
  });

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Transaction not found');
  }

  return result;
};

// ------------- get single transaction ----------------
const getSingleTransaction = async (id: string) => {
  const result = await Transaction.findById(id)
    .populate('user')
    .populate('reference.id');

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Transaction not found');
  }

  return result;
};

// ------------- get transactions by user id ----------------
const getTransactionsByUserId = async (
  userId: string,
  query: Record<string, unknown>,
) => {
  const transactionQuery = new QueryBuilder(
    Transaction.find({ user: userId }),
    query,
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const [data, pagination] = await Promise.all([
    transactionQuery.modelQuery.populate('user').populate('reference.id'),
    transactionQuery.getPaginationInfo(),
  ]);

  return { data, pagination };
};

// ------------- get all transactions ----------------
const getAllTransactions = async (query: Record<string, unknown>) => {
  const filter = {} as any;
  // pre-filter user
  if (query.searchTerm) {
    const users = await User.find({
      $or: [
        { firstName: { $regex: query.searchTerm, $options: 'i' } },
        { lastName: { $regex: query.searchTerm, $options: 'i' } },
        { email: { $regex: query.searchTerm, $options: 'i' } },
      ],
    });
    filter.user = users.map(user => user._id);
  }

  const transactionQuery = new QueryBuilder(Transaction.find(filter), query)
    .filter()
    .sort()
    .paginate()
    .fields();

  const [data, pagination] = await Promise.all([
    transactionQuery.modelQuery.populate('user').populate('reference.id'),
    transactionQuery.getPaginationInfo(),
  ]);

  return { data, pagination };
};

export const TransactionServices = {
  createStripeCheckoutSession,
  refundStripePayment,
  updateTransactionStatus,
  getSingleTransaction,
  getTransactionsByUserId,
  getAllTransactions,
};

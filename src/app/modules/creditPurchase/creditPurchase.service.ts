import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import mongoose from 'mongoose';
import type { Stripe } from 'stripe/types';
import QueryBuilder from '../../builder/QueryBuilder';
import config from '../../../config';
import { stripe } from '../../../config/stripe';
import ApiError from '../../../errors/ApiError';
import { errorLogger } from '../../../shared/logger';
import { Provider } from '../provider/provider.model';
import {
  CREDIT_CURRENCY,
  CreditPackageStatus,
} from '../creditPackage/creditPackage.constant';
import { CreditPackage } from '../creditPackage/creditPackage.model';
import {
  TransactionGateway,
  TransactionReferenceType,
  TransactionStatus,
  TransactionType,
} from '../transaction/transaction.constants';
import { Transaction } from '../transaction/transaction.model';
import { UserRole } from '../user/user.constant';
import { CreditPurchase } from './creditPurchase.model';

const purchaseFields = 'name creditsAmount price status';
const transactionFields =
  'uid amount currency status isPaid gatewayFee gatewayReferenceId paymentMethod';

const isStaff = (role: string) =>
  role === UserRole.Admin || role === UserRole.SuperAdmin;

const findProvider = async (userId: string) => {
  const provider = await Provider.findOne({ user: userId });
  if (!provider) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Provider profile not found');
  }
  return provider;
};

// ---------------- create credit purchase ----------------
const createCreditPurchaseService = async (
  user: JwtPayload,
  packageId: string,
) => {
  const provider = await findProvider(user.id);
  const creditPackage = await CreditPackage.findOne({
    _id: packageId,
    isDeleted: false,
  });

  if (!creditPackage) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Credit package not found');
  }
  if (
    creditPackage.status !== CreditPackageStatus.Active ||
    !creditPackage.stripePriceId
  ) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'This credit package is not available',
    );
  }

  const purchase = await CreditPurchase.create({
    provider: provider._id,
    package: creditPackage._id,
    creditsAmount: creditPackage.creditsAmount,
    pricing: {
      subtotal: creditPackage.price,
      discount: 0,
      total: creditPackage.price,
      currency: CREDIT_CURRENCY,
    },
  });

  let checkout: Stripe.Checkout.Session;
  try {
    checkout = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: creditPackage.stripePriceId, quantity: 1 }],
      success_url: `${config.frontend_url}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.frontend_url}/payment/cancel`,
      client_reference_id: purchase._id.toString(),
      customer_email: user.email,
      metadata: {
        userId: user.id,
        referenceType: TransactionReferenceType.CreditPurchase,
        referenceId: purchase._id.toString(),
      },
    });
  } catch (error) {
    await CreditPurchase.deleteOne({ _id: purchase._id });
    const detail =
      error instanceof Error ? error.message : 'unknown stripe error';
    errorLogger.error(`Could not start the payment: ${detail}`);
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Could not start the payment');
  }

  if (!checkout.id || !checkout.url) {
    await CreditPurchase.deleteOne({ _id: purchase._id });
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Could not start the payment');
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const transaction = new Transaction({
      user: user.id,
      reference: {
        type: TransactionReferenceType.CreditPurchase,
        id: purchase._id,
      },
      type: TransactionType.Payment,
      gateway: TransactionGateway.Stripe,
      gatewayReferenceId: checkout.id,
      amount: creditPackage.price,
      currency: CREDIT_CURRENCY,
      status: TransactionStatus.Pending,
      isPaid: false,
    });
    await transaction.save({ session });

    const savedPurchase = await CreditPurchase.findByIdAndUpdate(
      purchase._id,
      { transaction: transaction._id },
      { session, new: true },
    );
    if (!savedPurchase) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Could not start the payment',
      );
    }
    await session.commitTransaction();

    return {
      purchase: savedPurchase,
      transaction,
      checkoutUrl: checkout.url,
    };
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    await CreditPurchase.deleteOne({ _id: purchase._id });
    if (error instanceof ApiError) throw error;
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Could not start the payment');
  } finally {
    session.endSession();
  }
};

// ---------------- get credit purchase by id ----------------
const getCreditPurchaseByIdService = async (id: string, user: JwtPayload) => {
  const purchase = await CreditPurchase.findOne({ _id: id, isDeleted: false })
    .populate('package', purchaseFields)
    .populate('transaction', transactionFields);

  if (!purchase) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Credit purchase not found');
  }

  if (!isStaff(user.role)) {
    const provider = await findProvider(user.id);
    if (purchase.provider.toString() !== provider._id.toString()) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Credit purchase not found');
    }
  }

  return purchase;
};

// list purchases
const listPurchases = async (
  filter: Record<string, unknown>,
  query: Record<string, unknown>,
) => {
  const purchaseQuery = new QueryBuilder(CreditPurchase.find(filter), query)
    .search(['uid'])
    .filter(['isDeleted', 'provider'])
    .sort()
    .paginate()
    .fields();

  const [data, pagination] = await Promise.all([
    purchaseQuery.modelQuery
      .populate('package', purchaseFields)
      .populate('transaction', transactionFields)
      .lean(),
    purchaseQuery.getPaginationInfo(),
  ]);

  return { data, pagination };
};

// ---------------- get my credit purchases ----------------
const getMyCreditPurchasesService = async (
  userId: string,
  query: Record<string, unknown>,
) => {
  const provider = await findProvider(userId);
  return listPurchases({ provider: provider._id, isDeleted: false }, query);
};

// ---------------- get all credit purchases ----------------
const getAllCreditPurchasesService = async (query: Record<string, unknown>) =>
  listPurchases({ isDeleted: false }, query);

export const CreditPurchaseServices = {
  createCreditPurchaseService,
  getCreditPurchaseByIdService,
  getMyCreditPurchasesService,
  getAllCreditPurchasesService,
};

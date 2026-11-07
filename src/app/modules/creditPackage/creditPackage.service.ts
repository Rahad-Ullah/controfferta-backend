import { StatusCodes } from 'http-status-codes';
import QueryBuilder from '../../builder/QueryBuilder';
import { stripe } from '../../../config/stripe';
import ApiError from '../../../errors/ApiError';
import { errorLogger } from '../../../shared/logger';
import {
  CREDIT_CURRENCY,
  CreditPackageStatus,
  CreditPackageTag,
} from './creditPackage.constant';
import { ICreditPackage } from './creditPackage.interface';
import { CreditPackage } from './creditPackage.model';

type PackageInput = Pick<
  ICreditPackage,
  'name' | 'description' | 'creditsAmount' | 'price'
> & {
  tag?: CreditPackageTag;
  status?: CreditPackageStatus;
};

type PackageUpdate = Partial<PackageInput> & {
  tag?: CreditPackageTag | null;
};

// Stripe rejects unknown fields with its own message; the API returns this one
const stripeCall = async <T>(action: () => Promise<T>, message: string) => {
  try {
    return await action();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const detail =
      error instanceof Error ? error.message : 'unknown stripe error';
    errorLogger.error(`${message}: ${detail}`);
    throw new ApiError(StatusCodes.BAD_REQUEST, message);
  }
};

const createStripeProduct = (payload: PackageInput) =>
  stripe.products.create({
    name: payload.name,
    description: payload.description,
    metadata: { creditsAmount: String(payload.creditsAmount) },
  });

const createStripePrice = (productId: string, unitAmount: number) =>
  stripe.prices.create({
    product: productId,
    currency: CREDIT_CURRENCY.toLowerCase(),
    unit_amount: unitAmount * 100,  // convert to cents
  });

// ---------------- create credit package ----------------
const createCreditPackageService = async (payload: PackageInput) => {
  const product = await stripeCall(
    () => createStripeProduct(payload),
    'Could not create the credit package',
  );
  const price = await stripeCall(
    () => createStripePrice(product.id, payload.price),
    'Could not create the credit package',
  );

  const result = await CreditPackage.create({
    ...payload,
    stripeProductId: product.id,
    stripePriceId: price.id,
  });

  return result;
};

// ---------------- update credit package ----------------
const updateCreditPackageService = async (
  id: string,
  payload: PackageUpdate,
) => {
  const existing = await CreditPackage.findOne({ _id: id, isDeleted: false });
  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Credit package not found');
  }

  const name = payload.name ?? existing.name;
  const description = payload.description ?? existing.description;
  const creditsAmount = payload.creditsAmount ?? existing.creditsAmount;

  if (
    payload.name !== undefined ||
    payload.description !== undefined ||
    payload.creditsAmount !== undefined
  ) {
    await stripeCall(
      () =>
        stripe.products.update(existing.stripeProductId, {
          name,
          description,
          metadata: { creditsAmount: String(creditsAmount) },
        }),
      'Could not update the credit package',
    );
  }

  let stripePriceId = existing.stripePriceId;
  // a Stripe price cannot change, so a new price replaces the old one
  if (payload.price !== undefined && payload.price !== existing.price) {
    const price = await stripeCall(
      () =>
        createStripePrice(existing.stripeProductId, payload.price as number),
      'Could not update the credit package',
    );
    await stripeCall(
      () => stripe.prices.update(existing.stripePriceId, { active: false }),
      'Could not update the credit package',
    );
    stripePriceId = price.id;
  }

  const $set: Record<string, unknown> = {};
  if (payload.name !== undefined) $set.name = payload.name;
  if (payload.description !== undefined) $set.description = payload.description;
  if (payload.creditsAmount !== undefined)
    $set.creditsAmount = payload.creditsAmount;
  if (payload.price !== undefined) $set.price = payload.price;
  if (payload.status !== undefined) $set.status = payload.status;
  if (payload.tag) $set.tag = payload.tag;
  if (stripePriceId !== existing.stripePriceId)
    $set.stripePriceId = stripePriceId;

  const update: {
    $set?: Record<string, unknown>;
    $unset?: Record<string, 1>;
  } = {};
  if (Object.keys($set).length) update.$set = $set;
  if (payload.tag === null) update.$unset = { tag: 1 };

  if (!update.$set && !update.$unset) return existing;

  const result = await CreditPackage.findOneAndUpdate(
    { _id: id, isDeleted: false },
    update,
    { new: true, runValidators: true },
  );

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Credit package not found');
  }

  return result;
};

// ---------------- delete credit package ----------------
const deleteCreditPackageService = async (id: string) => {
  // soft delete so a purchase can still point at the package
  const result = await CreditPackage.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { isDeleted: true, status: CreditPackageStatus.Inactive },
    { new: true },
  );

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Credit package not found');
  }

  try {
    await stripe.products.update(result.stripeProductId, { active: false });
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : 'unknown stripe error';
    errorLogger.error(`Could not deactivate the Stripe product: ${detail}`);
  }

  return result;
};

// ---------------- get credit package by id ----------------
const getCreditPackageByIdService = async (id: string) => {
  const result = await CreditPackage.findOne({ _id: id, isDeleted: false });

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Credit package not found');
  }

  return result;
};

// ---------------- get active credit packages ----------------
const getCreditPackagesService = async (query: Record<string, unknown>) => {
  const packageQuery = new QueryBuilder(
    CreditPackage.find({
      isDeleted: false,
      status: CreditPackageStatus.Active,
    }),
    query,
  )
    .search(['name', 'description'])
    .filter(['isDeleted', 'status'])
    .sort()
    .paginate()
    .fields();

  const [data, pagination] = await Promise.all([
    packageQuery.modelQuery.lean(),
    packageQuery.getPaginationInfo(),
  ]);

  return { data, pagination };
};

// ---------------- get all credit packages ----------------
const getAllCreditPackagesService = async (query: Record<string, unknown>) => {
  const packageQuery = new QueryBuilder(
    CreditPackage.find({ isDeleted: false }),
    query,
  )
    .search(['name', 'description'])
    .filter(['isDeleted'])
    .sort()
    .paginate()
    .fields();

  const [data, pagination] = await Promise.all([
    packageQuery.modelQuery.lean(),
    packageQuery.getPaginationInfo(),
  ]);

  return { data, pagination };
};

export const CreditPackageServices = {
  createCreditPackageService,
  updateCreditPackageService,
  deleteCreditPackageService,
  getCreditPackageByIdService,
  getCreditPackagesService,
  getAllCreditPackagesService,
};

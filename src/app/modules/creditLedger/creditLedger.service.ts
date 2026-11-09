import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import { ClientSession } from 'mongoose';
import mongoose from 'mongoose';
import QueryBuilder from '../../builder/QueryBuilder';
import ApiError from '../../../errors/ApiError';
import { Provider } from '../provider/provider.model';
import { Setting } from '../setting/setting.model';
import { UserRole } from '../user/user.constant';
import {
  CreditLedgerReferenceType,
  CreditLedgerType,
} from './creditLedger.constant';
import { CreditLedger } from './creditLedger.model';

const providerFields = 'businessName creditBalance';
const userFields = 'firstName lastName';

type PostCreditLedgerInput = {
  providerId: string;
  type: CreditLedgerType;
  amount: number;
  reference?: {
    type: CreditLedgerReferenceType;
    id: string;
  };
  note?: string;
  createdBy?: string;
  session: ClientSession;
};

const isStaff = (role: string) =>
  role === UserRole.Admin || role === UserRole.SuperAdmin;

const isDuplicateKey = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code: number }).code === 11000;

const findProvider = async (userId: string) => {
  const provider = await Provider.findOne({ user: userId });
  if (!provider) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Provider profile not found');
  }
  return provider;
};

// ---------------- post credit ledger ----------------
// the balance and this row share the caller's transaction
const postCreditLedger = async ({
  providerId,
  type,
  amount,
  reference,
  note,
  createdBy,
  session,
}: PostCreditLedgerInput) => {
  const provider = await Provider.findOneAndUpdate(
    amount < 0
      ? { _id: providerId, creditBalance: { $gte: Math.abs(amount) } }
      : { _id: providerId },
    { $inc: { creditBalance: amount } },
    { new: true, session },
  );

  if (!provider) {
    const exists = await Provider.exists({ _id: providerId }).session(session);
    if (!exists) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Provider profile not found');
    }
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Not enough credits');
  }

  const entry = new CreditLedger({
    provider: providerId,
    type,
    amount,
    balanceAfter: provider.creditBalance,
    ...(reference ? { reference } : {}),
    note: note ?? '',
    ...(createdBy ? { createdBy } : {}),
  });

  try {
    await entry.save({ session });
  } catch (error) {
    if (isDuplicateKey(error)) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        'This credit entry already exists',
      );
    }
    throw error;
  }

  return entry;
};

// ---------------- grant welcome credits ----------------
const grantWelcomeCredits = async (
  providerId: string,
  session: ClientSession,
) => {
  const setting = await Setting.findOne().session(session);
  const amount = setting?.welcomeCreditAmount ?? 0;
  if (amount <= 0) return null;

  return postCreditLedger({
    providerId,
    type: CreditLedgerType.Welcome,
    amount,
    session,
  });
};

// ---------------- adjust credit ledger ----------------
const adjustCreditLedgerService = async (
  user: JwtPayload,
  payload: { provider: string; amount: number; note: string },
) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const entry = await postCreditLedger({
      providerId: payload.provider,
      type: CreditLedgerType.Adjustment,
      amount: payload.amount,
      note: payload.note,
      createdBy: user.id,
      session,
    });
    await session.commitTransaction();
    return entry;
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const listEntries = async (
  filter: Record<string, unknown>,
  query: Record<string, unknown>,
) => {
  const ledgerQuery = new QueryBuilder(CreditLedger.find(filter), query)
    .search(['uid', 'note'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const [data, pagination] = await Promise.all([
    ledgerQuery.modelQuery
      .populate('provider', providerFields)
      .populate('createdBy', userFields)
      .lean(),
    ledgerQuery.getPaginationInfo(),
  ]);

  return { data, pagination };
};

// ---------------- get my credit ledger ----------------
const getMyCreditLedgerService = async (
  userId: string,
  query: Record<string, unknown>,
) => {
  const provider = await findProvider(userId);
  return listEntries({ provider: provider._id }, query);
};

// ---------------- get all credit ledger ----------------
const getAllCreditLedgerService = async (query: Record<string, unknown>) =>
  listEntries({}, query);

// ---------------- get credit ledger by id ----------------
const getCreditLedgerByIdService = async (id: string, user: JwtPayload) => {
  const entry = await CreditLedger.findById(id);
  if (!entry) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Credit ledger not found');
  }

  if (!isStaff(user.role)) {
    const provider = await findProvider(user.id);
    if (entry.provider.toString() !== provider._id.toString()) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Credit ledger not found');
    }
  }

  await entry.populate('provider', providerFields);
  await entry.populate('createdBy', userFields);
  return entry;
};

export const CreditLedgerServices = {
  postCreditLedger,
  grantWelcomeCredits,
  adjustCreditLedgerService,
  getMyCreditLedgerService,
  getAllCreditLedgerService,
  getCreditLedgerByIdService,
};

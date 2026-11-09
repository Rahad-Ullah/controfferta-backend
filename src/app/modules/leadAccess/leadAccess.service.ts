import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import mongoose from 'mongoose';
import QueryBuilder from '../../builder/QueryBuilder';
import ApiError from '../../../errors/ApiError';
import { Category } from '../category/category.model';
import {
  CreditLedgerReferenceType,
  CreditLedgerType,
} from '../creditLedger/creditLedger.constant';
import { CreditLedgerServices } from '../creditLedger/creditLedger.service';
import { LeadStatus } from '../lead/lead.constant';
import { Lead } from '../lead/lead.model';
import { Provider } from '../provider/provider.model';
import { UserRole } from '../user/user.constant';
import {
  LeadAccessStatus,
  leadAccessStatusTransitions,
} from './leadAccess.constant';
import { LeadAccess } from './leadAccess.model';

const leadPopulate = {
  path: 'lead',
  select: 'uid title description address budgetRange timeline client status category',
  populate: { path: 'category', select: 'name creditCost iconUrl' },
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

// ---------------- unlock lead ----------------
const unlockLeadService = async (user: JwtPayload, leadId: string) => {
  const provider = await findProvider(user.id);
  const lead = await Lead.findOne({ _id: leadId, isDeleted: false });
  if (!lead) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Lead not found');
  }
  if (lead.status !== LeadStatus.Accepted) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'This lead is not available');
  }

  // charge the live category price and keep that number on the access row
  const category = await Category.findById(lead.category);
  if (!category) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Category not found');
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const access = new LeadAccess({
      lead: lead._id,
      provider: provider._id,
      creditCost: category.creditCost,
      status: LeadAccessStatus.Unlocked,
      unlockedAt: new Date(),
    });

    try {
      await access.save({ session });
    } catch (error) {
      if (isDuplicateKey(error)) {
        throw new ApiError(StatusCodes.CONFLICT, 'Lead already unlocked');
      }
      throw error;
    }

    await CreditLedgerServices.postCreditLedger({
      providerId: provider._id.toString(),
      type: CreditLedgerType.Unlock,
      amount: -category.creditCost,
      reference: {
        type: CreditLedgerReferenceType.LeadAccess,
        id: access._id.toString(),
      },
      session,
    });

    await session.commitTransaction();
    await access.populate(leadPopulate);
    return access;
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// ---------------- update lead access status ----------------
const updateLeadAccessStatusService = async (
  id: string,
  status: LeadAccessStatus,
  user: JwtPayload,
) => {
  const provider = await findProvider(user.id);
  const access = await LeadAccess.findOne({
    _id: id,
    provider: provider._id,
    isDeleted: false,
  });
  if (!access) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Lead access not found');
  }

  const allowed = leadAccessStatusTransitions[access.status];
  if (!allowed.includes(status)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'This status change is not allowed',
    );
  }

  access.status = status;
  await access.save();
  await access.populate(leadPopulate);
  return access;
};

const listAccesses = async (
  filter: Record<string, unknown>,
  query: Record<string, unknown>,
) => {
  const accessQuery = new QueryBuilder(LeadAccess.find(filter), query)
    .filter()
    .sort()
    .paginate()
    .fields();

  const [data, pagination] = await Promise.all([
    accessQuery.modelQuery.populate(leadPopulate).lean(),
    accessQuery.getPaginationInfo(),
  ]);

  return { data, pagination };
};

// ---------------- get my lead accesses ----------------
const getMyLeadAccessesService = async (
  userId: string,
  query: Record<string, unknown>,
) => {
  const provider = await findProvider(userId);
  return listAccesses({ provider: provider._id, isDeleted: false }, query);
};

// ---------------- get all lead accesses ----------------
const getAllLeadAccessesService = async (query: Record<string, unknown>) =>
  listAccesses({ isDeleted: false }, query);

// ---------------- get lead access by id ----------------
const getLeadAccessByIdService = async (id: string, user: JwtPayload) => {
  const access = await LeadAccess.findOne({ _id: id, isDeleted: false });
  if (!access) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Lead access not found');
  }

  if (!isStaff(user.role)) {
    const provider = await findProvider(user.id);
    if (access.provider.toString() !== provider._id.toString()) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Lead access not found');
    }
  }

  await access.populate(leadPopulate);
  return access;
};

export const LeadAccessServices = {
  unlockLeadService,
  updateLeadAccessStatusService,
  getMyLeadAccessesService,
  getAllLeadAccessesService,
  getLeadAccessByIdService,
};

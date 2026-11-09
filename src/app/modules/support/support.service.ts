import { StatusCodes } from 'http-status-codes';
import QueryBuilder from '../../builder/QueryBuilder';
import ApiError from '../../../errors/ApiError';
import { SupportPriority, SupportStatus } from './support.constants';
import { Support } from './support.model';

// ---------------- create support message ----------------
const createSupportService = async (payload: {
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  message: string;
}) => {
  // anyone can write in; status and priority stay at the defaults
  return Support.create(payload);
};

// ---------------- update support message ----------------
const updateSupportService = async (
  id: string,
  payload: { status?: SupportStatus; priority?: SupportPriority },
) => {
  const support = await Support.findOneAndUpdate(
    { _id: id, isDeleted: false },
    payload,
    { new: true, runValidators: true },
  );

  if (!support) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Support message not found');
  }

  return support;
};

// ---------------- delete support message ----------------
const deleteSupportService = async (id: string) => {
  // soft delete so the inbox can drop a message without losing the row
  const support = await Support.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { isDeleted: true },
    { new: true },
  );

  if (!support) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Support message not found');
  }

  return support;
};

// ---------------- get support message by id ----------------
const getSupportByIdService = async (id: string) => {
  const support = await Support.findOne({ _id: id, isDeleted: false });

  if (!support) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Support message not found');
  }

  return support;
};

// ---------------- get support messages ----------------
const getSupportsService = async (query: Record<string, unknown>) => {
  const supportQuery = new QueryBuilder(
    Support.find({ isDeleted: false }),
    query,
  )
    .search(['firstName', 'lastName', 'email', 'subject', 'message'])
    .filter(['isDeleted'])
    .sort()
    .paginate()
    .fields();

  const [data, pagination] = await Promise.all([
    supportQuery.modelQuery.lean(),
    supportQuery.getPaginationInfo(),
  ]);

  return { data, pagination };
};

export const SupportServices = {
  createSupportService,
  updateSupportService,
  deleteSupportService,
  getSupportByIdService,
  getSupportsService,
};

import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import { FilterQuery } from 'mongoose';
import QueryBuilder from '../../builder/QueryBuilder';
import ApiError from '../../../errors/ApiError';
import { Category } from '../category/category.model';
import { UserRole } from '../user/user.constant';
import { LeadStatus, leadStatusTransitions } from './lead.constant';
import { ILead } from './lead.interface';
import { Lead } from './lead.model';

const categoryFields = 'name creditCost iconUrl';

const isStaff = (role: string) =>
  role === UserRole.Admin || role === UserRole.SuperAdmin;

// contact stays hidden until a provider unlocks the lead
const hideContact = (lead: object) => {
  const rest = { ...(lead as Record<string, unknown>) };
  delete rest.client;
  return rest;
};

const createdAtRange = (query: Record<string, unknown>) => {
  const range: { $gte?: Date; $lte?: Date } = {};
  if (typeof query.from === 'string') range.$gte = new Date(query.from);
  if (typeof query.to === 'string') range.$lte = new Date(query.to);
  return Object.keys(range).length ? range : undefined;
};

// ---------------- create lead ----------------
const createLeadService = async (
  payload: Omit<
    ILead,
    '_id' | 'uid' | 'status' | 'isDeleted' | 'createdAt' | 'updatedAt'
  >,
) => {
  // check if the category is active
  const category = await Category.exists({
    _id: payload.category,
    isDeleted: false,
  });
  if (!category) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Category not found');
  }

  const result = await Lead.create(payload);
  return result.populate('category', categoryFields);
};

// ---------------- update lead status ----------------
const updateLeadStatusService = async (id: string, status: LeadStatus) => {
  const lead = await Lead.findOne({ _id: id, isDeleted: false });
  if (!lead) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Lead not found');
  }

  // only allow the next status in the review flow
  const allowed = leadStatusTransitions[lead.status];
  if (!allowed.includes(status)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'This status change is not allowed',
    );
  }

  lead.status = status;
  await lead.save();
  return lead.populate('category', categoryFields);
};

// ---------------- delete lead ----------------
const deleteLeadService = async (id: string) => {
  // soft delete, and leave any future unlock rows in place
  const result = await Lead.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { isDeleted: true },
    { new: true },
  );

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Lead not found');
  }

  return result;
};

// ---------------- get lead by id ----------------
const getLeadByIdService = async (id: string, user: JwtPayload) => {
  const staff = isStaff(user.role);
  const lead = await Lead.findOne({
    _id: id,
    isDeleted: false,
    // providers only see accepted leads
    ...(staff ? {} : { status: LeadStatus.Accepted }),
  })
    .populate('category', categoryFields)
    .lean();

  if (!lead) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Lead not found');
  }

  // hide contact until the lead is unlocked
  if (!staff) return hideContact(lead);
  return lead;
};

// ---------------- get lead feed ----------------
const getLeadFeedService = async (query: Record<string, unknown>) => {
  const filter: FilterQuery<ILead> = {
    isDeleted: false,
    status: LeadStatus.Accepted,
  };
  const createdAt = createdAtRange(query);
  if (createdAt) filter.createdAt = createdAt;

  // accepted leads only, searched by the project address
  const leadQuery = new QueryBuilder(Lead.find(filter), query)
    .search(['address'])
    .filter(['isDeleted', 'status', 'from', 'to'])
    .sort()
    .paginate()
    .fields();

  const [rows, pagination] = await Promise.all([
    leadQuery.modelQuery.populate('category', categoryFields).lean(),
    leadQuery.getPaginationInfo(),
  ]);

  return {
    data: rows.map(lead => hideContact(lead)),
    pagination,
  };
};

// ---------------- get all leads ----------------
const getAllLeadsService = async (query: Record<string, unknown>) => {
  const leadQuery = new QueryBuilder(Lead.find({ isDeleted: false }), query)
    .search(['title', 'address', 'client.name', 'client.email'])
    .filter(['isDeleted'])
    .sort()
    .paginate()
    .fields();

  const [data, pagination] = await Promise.all([
    leadQuery.modelQuery.populate('category', categoryFields).lean(),
    leadQuery.getPaginationInfo(),
  ]);

  return { data, pagination };
};

export const LeadServices = {
  createLeadService,
  updateLeadStatusService,
  deleteLeadService,
  getLeadByIdService,
  getLeadFeedService,
  getAllLeadsService,
};

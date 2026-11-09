import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import QueryBuilder from '../../builder/QueryBuilder';
import ApiError from '../../../errors/ApiError';
import { PlatformReviewStatus } from './platformReview.constant';
import { PlatformReview } from './platformReview.model';

const userFields = 'firstName lastName';

// ---------------- create platform review ----------------
const createPlatformReviewService = async (
  user: JwtPayload,
  payload: { rating: number; message: string },
) => {
  const review = await PlatformReview.create({
    user: user.id,
    rating: payload.rating,
    message: payload.message,
  });

  return review.populate('user', userFields);
};

// ---------------- update platform review status ----------------
const updatePlatformReviewStatusService = async (
  id: string,
  status: PlatformReviewStatus,
) => {
  const review = await PlatformReview.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { status },
    { new: true, runValidators: true },
  ).populate('user', userFields);

  if (!review) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Platform review not found');
  }

  return review;
};

// ---------------- delete platform review ----------------
const deletePlatformReviewService = async (id: string) => {
  // soft delete so a published page can drop the review without losing the row
  const review = await PlatformReview.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { isDeleted: true },
    { new: true },
  );

  if (!review) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Platform review not found');
  }

  return review;
};

// ---------------- get platform review by id ----------------
const getPlatformReviewByIdService = async (id: string) => {
  const review = await PlatformReview.findOne({
    _id: id,
    isDeleted: false,
    status: PlatformReviewStatus.Published,
  }).populate('user', userFields);

  if (!review) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Platform review not found');
  }

  return review;
};

const listReviews = async (
  filter: Record<string, unknown>,
  query: Record<string, unknown>,
) => {
  const reviewQuery = new QueryBuilder(PlatformReview.find(filter), query)
    .search(['message'])
    .filter(['isDeleted', 'user'])
    .sort()
    .paginate()
    .fields();

  const [data, pagination] = await Promise.all([
    reviewQuery.modelQuery.populate('user', userFields).lean(),
    reviewQuery.getPaginationInfo(),
  ]);

  return { data, pagination };
};

// ---------------- get published platform reviews ----------------
const getPlatformReviewsService = async (query: Record<string, unknown>) =>
  listReviews(
    { isDeleted: false, status: PlatformReviewStatus.Published },
    query,
  );

// ---------------- get my platform reviews ----------------
const getMyPlatformReviewsService = async (
  userId: string,
  query: Record<string, unknown>,
) => listReviews({ isDeleted: false, user: userId }, query);

// ---------------- get all platform reviews ----------------
const getAllPlatformReviewsService = async (query: Record<string, unknown>) =>
  listReviews({ isDeleted: false }, query);

export const PlatformReviewServices = {
  createPlatformReviewService,
  updatePlatformReviewStatusService,
  deletePlatformReviewService,
  getPlatformReviewByIdService,
  getPlatformReviewsService,
  getMyPlatformReviewsService,
  getAllPlatformReviewsService,
};

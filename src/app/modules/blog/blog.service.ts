import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import QueryBuilder from '../../builder/QueryBuilder';
import ApiError from '../../../errors/ApiError';
import { Category } from '../category/category.model';
import { BlogStatus } from './blog.constant';
import { Blog } from './blog.model';

const authorFields = 'firstName lastName';
const categoryFields = 'name iconUrl';

const withRelations = { path: 'category', select: categoryFields };

const findActiveCategory = async (categoryId: string) => {
  const category = await Category.exists({
    _id: categoryId,
    isDeleted: false,
  });
  if (!category) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Category not found');
  }
};

// ---------------- create blog ----------------
const createBlogService = async (
  user: JwtPayload,
  payload: {
    category: string;
    title: string;
    description: string;
    bodyContent: string;
    imageUrl?: string;
  },
) => {
  // the category must still be on the site
  await findActiveCategory(payload.category.toString());

  // a new post stays off the public list until an admin publishes it
  const blog = await Blog.create({
    ...payload,
    author: user.id,
    imageUrl: payload.imageUrl ?? '',
  });

  await blog.populate('author', authorFields);
  await blog.populate(withRelations);
  return blog;
};

// ---------------- update blog ----------------
const updateBlogService = async (
  id: string,
  payload: {
    category?: string;
    title?: string;
    description?: string;
    bodyContent?: string;
    imageUrl?: string;
  },
) => {
  if (payload.category) {
    await findActiveCategory(payload.category);
  }

  const blog = await Blog.findOneAndUpdate(
    { _id: id, isDeleted: false },
    payload,
    { new: true, runValidators: true },
  )
    .populate('author', authorFields)
    .populate(withRelations);

  if (!blog) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Blog not found');
  }

  return blog;
};

// ---------------- update blog status ----------------
const updateBlogStatusService = async (id: string, status: BlogStatus) => {
  const blog = await Blog.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { status },
    { new: true, runValidators: true },
  )
    .populate('author', authorFields)
    .populate(withRelations);

  if (!blog) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Blog not found');
  }

  return blog;
};

// ---------------- delete blog ----------------
const deleteBlogService = async (id: string) => {
  // soft delete so a published page can drop the post without losing the row
  const blog = await Blog.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { isDeleted: true },
    { new: true },
  );

  if (!blog) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Blog not found');
  }

  return blog;
};

// ---------------- get blog by id ----------------
const getBlogByIdService = async (id: string) => {
  const blog = await Blog.findOne({
    _id: id,
    isDeleted: false,
    status: BlogStatus.Published,
  })
    .populate('author', authorFields)
    .populate(withRelations);

  if (!blog) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Blog not found');
  }

  return blog;
};

const listBlogs = async (
  filter: Record<string, unknown>,
  query: Record<string, unknown>,
  exclude: string[],
) => {
  const blogQuery = new QueryBuilder(Blog.find(filter), query)
    .search(['title', 'description', 'bodyContent'])
    .filter(exclude)
    .sort()
    .paginate()
    .fields();

  const [data, pagination] = await Promise.all([
    blogQuery.modelQuery
      .populate('author', authorFields)
      .populate(withRelations)
      .lean(),
    blogQuery.getPaginationInfo(),
  ]);

  return { data, pagination };
};

// ---------------- get published blogs ----------------
const getBlogsService = async (query: Record<string, unknown>) =>
  listBlogs({ isDeleted: false, status: BlogStatus.Published }, query, [
    'isDeleted',
    'status',
  ]);

// ---------------- get all blogs ----------------
const getAllBlogsService = async (query: Record<string, unknown>) =>
  listBlogs({ isDeleted: false }, query, ['isDeleted']);

export const BlogServices = {
  createBlogService,
  updateBlogService,
  updateBlogStatusService,
  deleteBlogService,
  getBlogByIdService,
  getBlogsService,
  getAllBlogsService,
};

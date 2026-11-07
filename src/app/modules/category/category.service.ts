import { StatusCodes } from 'http-status-codes';
import { FilterQuery } from 'mongoose';
import QueryBuilder from '../../builder/QueryBuilder';
import ApiError from '../../../errors/ApiError';
import { Category } from './category.model';
import { ICategory } from './category.interface';

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const activeNameFilter = (
  name: string,
  excludeId?: string,
): FilterQuery<ICategory> => {
  const filter: FilterQuery<ICategory> = {
    isDeleted: false,
    name: { $regex: `^${escapeRegex(name.trim())}$`, $options: 'i' },
  };

  if (excludeId) filter._id = { $ne: excludeId };
  return filter;
};

const createCategoryService = async (
  payload: Pick<ICategory, 'name' | 'description' | 'creditCost'> & {
    iconUrl?: string;
  },
): Promise<ICategory> => {
  const existing = await Category.exists(activeNameFilter(payload.name));
  if (existing) {
    throw new ApiError(StatusCodes.CONFLICT, 'Category already exists');
  }

  const result = await Category.create(payload);
  return result;
};

const updateCategoryService = async (
  id: string,
  payload: Partial<
    Pick<ICategory, 'name' | 'description' | 'iconUrl' | 'creditCost'>
  >,
): Promise<ICategory> => {
  if (payload.name) {
    const existing = await Category.exists(activeNameFilter(payload.name, id));
    if (existing) {
      throw new ApiError(StatusCodes.CONFLICT, 'Category already exists');
    }
  }

  const result = await Category.findOneAndUpdate(
    { _id: id, isDeleted: false },
    payload,
    { new: true, runValidators: true },
  );

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Category not found');
  }

  return result;
};

const deleteCategoryService = async (id: string): Promise<ICategory> => {
  const result = await Category.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { isDeleted: true },
    { new: true },
  );

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Category not found');
  }

  return result;
};

const getCategoryByIdService = async (id: string): Promise<ICategory> => {
  const result = await Category.findOne({ _id: id, isDeleted: false });

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Category not found');
  }

  return result;
};

const getAllCategoriesService = async (query: Record<string, unknown>) => {
  const categoryQuery = new QueryBuilder(
    Category.find({ isDeleted: false }),
    query,
  )
    .search(['name', 'description'])
    .filter(['isDeleted'])
    .sort()
    .paginate()
    .fields();

  const [data, pagination] = await Promise.all([
    categoryQuery.modelQuery.lean(),
    categoryQuery.getPaginationInfo(),
  ]);

  return { data, pagination };
};

export const CategoryServices = {
  createCategoryService,
  updateCategoryService,
  deleteCategoryService,
  getCategoryByIdService,
  getAllCategoriesService,
};

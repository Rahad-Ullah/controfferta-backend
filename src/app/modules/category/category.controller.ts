import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { CategoryServices } from './category.service';

// create category
const createCategoryController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await CategoryServices.createCategoryService(req.body);

    sendResponse(res, {
      statusCode: StatusCodes.CREATED,
      success: true,
      message: 'Category created successfully',
      data: result,
    });
  },
);

// update category
const updateCategoryController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await CategoryServices.updateCategoryService(
      req.params.id,
      req.body,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Category updated successfully',
      data: result,
    });
  },
);

// delete category
const deleteCategoryController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await CategoryServices.deleteCategoryService(req.params.id);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Category deleted successfully',
      data: result,
    });
  },
);

// get category by id
const getCategoryByIdController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await CategoryServices.getCategoryByIdService(req.params.id);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Category fetched successfully',
      data: result,
    });
  },
);

// get all categories
const getAllCategoriesController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await CategoryServices.getAllCategoriesService(req.query);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Categories fetched successfully',
      data: result.data,
      pagination: result.pagination,
    });
  },
);

export const CategoryController = {
  createCategoryController,
  updateCategoryController,
  deleteCategoryController,
  getCategoryByIdController,
  getAllCategoriesController,
};

import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { BlogServices } from './blog.service';

// create blog
const createBlogController = catchAsync(async (req: Request, res: Response) => {
  const result = await BlogServices.createBlogService(req.user, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Blog created successfully',
    data: result,
  });
});

// update blog
const updateBlogController = catchAsync(async (req: Request, res: Response) => {
  const result = await BlogServices.updateBlogService(req.params.id, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Blog updated successfully',
    data: result,
  });
});

// update blog status
const updateBlogStatusController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await BlogServices.updateBlogStatusService(
      req.params.id,
      req.body.status,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Blog status updated successfully',
      data: result,
    });
  },
);

// delete blog
const deleteBlogController = catchAsync(async (req: Request, res: Response) => {
  const result = await BlogServices.deleteBlogService(req.params.id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Blog deleted successfully',
    data: result,
  });
});

// get blog by id
const getBlogByIdController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await BlogServices.getBlogByIdService(req.params.id);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Blog fetched successfully',
      data: result,
    });
  },
);

// get published blogs
const getBlogsController = catchAsync(async (req: Request, res: Response) => {
  const result = await BlogServices.getBlogsService(req.query);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Blogs fetched successfully',
    data: result.data,
    pagination: result.pagination,
  });
});

// get all blogs
const getAllBlogsController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await BlogServices.getAllBlogsService(req.query);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Blogs fetched successfully',
      data: result.data,
      pagination: result.pagination,
    });
  },
);

export const BlogController = {
  createBlogController,
  updateBlogController,
  updateBlogStatusController,
  deleteBlogController,
  getBlogByIdController,
  getBlogsController,
  getAllBlogsController,
};

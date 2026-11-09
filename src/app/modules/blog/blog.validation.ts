import { z } from 'zod';
import { objectId } from '../../../shared/objectIdValidator';
import { BlogStatus } from './blog.constant';

const imageUrl = z.union([z.string().url(), z.literal('')]).optional();

const title = z
  .string({ required_error: 'Title is required' })
  .trim()
  .min(1, 'Title is required');

const description = z
  .string({ required_error: 'Description is required' })
  .trim()
  .min(1, 'Description is required');

const bodyContent = z
  .string({ required_error: 'Body is required' })
  .trim()
  .min(1, 'Body is required');

const listQuery = {
  searchTerm: z.string().optional(),
  category: objectId('category id').optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  sort: z.string().optional(),
};

const createBlogValidation = z.object({
  body: z
    .object({
      category: objectId('category id'),
      title,
      description,
      bodyContent,
      imageUrl,
    })
    .strict(),
});

const updateBlogValidation = z.object({
  params: z
    .object({
      id: objectId('blog id'),
    })
    .strict(),
  body: z
    .object({
      category: objectId('category id').optional(),
      title: title.optional(),
      description: description.optional(),
      bodyContent: bodyContent.optional(),
      imageUrl,
    })
    .strict(),
});

const updateBlogStatusValidation = z.object({
  params: z
    .object({
      id: objectId('blog id'),
    })
    .strict(),
  body: z
    .object({
      status: z.nativeEnum(BlogStatus, {
        required_error: 'Status is required',
      }),
    })
    .strict(),
});

const blogIdValidation = z.object({
  params: z
    .object({
      id: objectId('blog id'),
    })
    .strict(),
});

const getBlogsValidation = z.object({
  query: z.object(listQuery).strict(),
});

const getAllBlogsValidation = z.object({
  query: z
    .object({
      ...listQuery,
      status: z.nativeEnum(BlogStatus).optional(),
    })
    .strict(),
});

export const BlogValidations = {
  createBlogValidation,
  updateBlogValidation,
  updateBlogStatusValidation,
  blogIdValidation,
  getBlogsValidation,
  getAllBlogsValidation,
};

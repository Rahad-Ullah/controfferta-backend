import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { UserRole } from '../user/user.constant';
import { BlogController } from './blog.controller';
import { BlogValidations } from './blog.validation';

const router = express.Router();

// create blog
router.post(
  '/create',
  auth(UserRole.Admin, UserRole.SuperAdmin),
  validateRequest(BlogValidations.createBlogValidation),
  BlogController.createBlogController,
);

// update blog status
router.patch(
  '/:id/status',
  auth(UserRole.Admin, UserRole.SuperAdmin),
  validateRequest(BlogValidations.updateBlogStatusValidation),
  BlogController.updateBlogStatusController,
);

// update blog
router.patch(
  '/:id',
  auth(UserRole.Admin, UserRole.SuperAdmin),
  validateRequest(BlogValidations.updateBlogValidation),
  BlogController.updateBlogController,
);

// delete blog
router.delete(
  '/:id',
  auth(UserRole.Admin, UserRole.SuperAdmin),
  validateRequest(BlogValidations.blogIdValidation),
  BlogController.deleteBlogController,
);

// get all blogs
router.get(
  '/all',
  auth(UserRole.Admin, UserRole.SuperAdmin),
  validateRequest(BlogValidations.getAllBlogsValidation),
  BlogController.getAllBlogsController,
);

// get blog by id
router.get(
  '/:id',
  validateRequest(BlogValidations.blogIdValidation),
  BlogController.getBlogByIdController,
);

// get published blogs
router.get(
  '/',
  validateRequest(BlogValidations.getBlogsValidation),
  BlogController.getBlogsController,
);

export const blogRoutes = router;

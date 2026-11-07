import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { UserRole } from '../user/user.constant';
import { CategoryController } from './category.controller';
import { CategoryValidations } from './category.validation';

const router = express.Router();

router.post(
  '/create',
  auth(UserRole.Admin, UserRole.SuperAdmin),
  validateRequest(CategoryValidations.createCategoryValidation),
  CategoryController.createCategoryController,
);

router.patch(
  '/:id',
  auth(UserRole.Admin, UserRole.SuperAdmin),
  validateRequest(CategoryValidations.updateCategoryValidation),
  CategoryController.updateCategoryController,
);

router.delete(
  '/:id',
  auth(UserRole.Admin, UserRole.SuperAdmin),
  validateRequest(CategoryValidations.categoryIdValidation),
  CategoryController.deleteCategoryController,
);

router.get(
  '/:id',
  validateRequest(CategoryValidations.categoryIdValidation),
  CategoryController.getCategoryByIdController,
);

router.get(
  '/',
  validateRequest(CategoryValidations.getAllCategoriesValidation),
  CategoryController.getAllCategoriesController,
);

export const categoryRoutes = router;

import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { UserRole } from '../user/user.constant';
import { CategoryController } from './category.controller';
import { CategoryValidations } from './category.validation';

const router = express.Router();

// create category
router.post(
  '/create',
  auth(UserRole.Admin, UserRole.SuperAdmin),
  validateRequest(CategoryValidations.createCategoryValidation),
  CategoryController.createCategoryController,
);

// update category
router.patch(
  '/:id',
  auth(UserRole.Admin, UserRole.SuperAdmin),
  validateRequest(CategoryValidations.updateCategoryValidation),
  CategoryController.updateCategoryController,
);

// delete category
router.delete(
  '/:id',
  auth(UserRole.Admin, UserRole.SuperAdmin),
  validateRequest(CategoryValidations.categoryIdValidation),
  CategoryController.deleteCategoryController,
);

// get category by id
router.get(
  '/:id',
  validateRequest(CategoryValidations.categoryIdValidation),
  CategoryController.getCategoryByIdController,
);

// get all categories
router.get(
  '/',
  validateRequest(CategoryValidations.getAllCategoriesValidation),
  CategoryController.getAllCategoriesController,
);

export const categoryRoutes = router;

import { registerApiRoute } from '../../../helpers/openapi-helper';
import { CategoryValidations } from './category.validation';

export function registerCategoryDocs() {
  const registerCategory = (opts: Parameters<typeof registerApiRoute>[0]) => {
    registerApiRoute({ tags: ['Category'], ...opts });
  };

  registerCategory({
    method: 'post',
    path: '/categories/create',
    summary: 'Create a service category',
    body: CategoryValidations.createCategoryValidation.shape.body,
    isAuth: true,
  });

  registerCategory({
    method: 'patch',
    path: '/categories/:id',
    summary: 'Update a service category',
    params: CategoryValidations.updateCategoryValidation.shape.params,
    body: CategoryValidations.updateCategoryValidation.shape.body,
    isAuth: true,
  });

  registerCategory({
    method: 'delete',
    path: '/categories/:id',
    summary: 'Delete a service category',
    params: CategoryValidations.categoryIdValidation.shape.params,
    isAuth: true,
  });

  registerCategory({
    method: 'get',
    path: '/categories/:id',
    summary: 'Get a service category',
    params: CategoryValidations.categoryIdValidation.shape.params,
  });

  registerCategory({
    method: 'get',
    path: '/categories',
    summary: 'List service categories',
    query: CategoryValidations.getAllCategoriesValidation.shape.query,
  });
}

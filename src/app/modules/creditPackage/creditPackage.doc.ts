import { registerApiRoute } from '../../../helpers/openapi-helper';
import { CreditPackageValidations } from './creditPackage.validation';

export function registerCreditPackageDocs() {
  const registerCreditPackage = (
    opts: Parameters<typeof registerApiRoute>[0],
  ) => {
    registerApiRoute({ tags: ['Credit package'], ...opts });
  };

  registerCreditPackage({
    method: 'post',
    path: '/credit-packages/create',
    summary: 'Create a credit package',
    body: CreditPackageValidations.createCreditPackageValidation.shape.body,
    isAuth: true,
  });

  registerCreditPackage({
    method: 'patch',
    path: '/credit-packages/:id',
    summary: 'Update a credit package',
    params: CreditPackageValidations.updateCreditPackageValidation.shape.params,
    body: CreditPackageValidations.updateCreditPackageValidation.shape.body,
    isAuth: true,
  });

  registerCreditPackage({
    method: 'delete',
    path: '/credit-packages/:id',
    summary: 'Delete a credit package',
    params: CreditPackageValidations.creditPackageIdValidation.shape.params,
    isAuth: true,
  });

  registerCreditPackage({
    method: 'get',
    path: '/credit-packages/all',
    summary: 'List every credit package',
    query: CreditPackageValidations.getAllCreditPackagesValidation.shape.query,
    isAuth: true,
  });

  registerCreditPackage({
    method: 'get',
    path: '/credit-packages/:id',
    summary: 'Get a credit package',
    params: CreditPackageValidations.creditPackageIdValidation.shape.params,
  });

  registerCreditPackage({
    method: 'get',
    path: '/credit-packages',
    summary: 'List credit packages for sale',
    query: CreditPackageValidations.getCreditPackagesValidation.shape.query,
  });
}

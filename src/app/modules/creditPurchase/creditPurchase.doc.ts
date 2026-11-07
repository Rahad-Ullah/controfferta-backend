import { registerApiRoute } from '../../../helpers/openapi-helper';
import { CreditPurchaseValidations } from './creditPurchase.validation';

export function registerCreditPurchaseDocs() {
  const registerCreditPurchase = (
    opts: Parameters<typeof registerApiRoute>[0],
  ) => {
    registerApiRoute({ tags: ['Credit purchase'], ...opts });
  };

  registerCreditPurchase({
    method: 'post',
    path: '/credit-purchases/create',
    summary: 'Start a credit purchase',
    body: CreditPurchaseValidations.createCreditPurchaseValidation.shape.body,
    isAuth: true,
  });

  registerCreditPurchase({
    method: 'get',
    path: '/credit-purchases/all',
    summary: 'List every credit purchase',
    query: CreditPurchaseValidations.getCreditPurchasesValidation.shape.query,
    isAuth: true,
  });

  registerCreditPurchase({
    method: 'get',
    path: '/credit-purchases/:id',
    summary: 'Get a credit purchase',
    params: CreditPurchaseValidations.creditPurchaseIdValidation.shape.params,
    isAuth: true,
  });

  registerCreditPurchase({
    method: 'get',
    path: '/credit-purchases',
    summary: 'List my credit purchases',
    query: CreditPurchaseValidations.getCreditPurchasesValidation.shape.query,
    isAuth: true,
  });
}

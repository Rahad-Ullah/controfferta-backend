import { registerApiRoute } from '../../../helpers/openapi-helper';
import { CreditLedgerValidations } from './creditLedger.validation';

export function registerCreditLedgerDocs() {
  const registerCreditLedger = (
    opts: Parameters<typeof registerApiRoute>[0],
  ) => {
    registerApiRoute({ tags: ['Credit ledger'], ...opts });
  };

  registerCreditLedger({
    method: 'post',
    path: '/credit-ledgers/adjust',
    summary: 'Record a credit adjustment',
    body: CreditLedgerValidations.adjustCreditLedgerValidation.shape.body,
    isAuth: true,
  });

  registerCreditLedger({
    method: 'get',
    path: '/credit-ledgers/all',
    summary: 'List every credit ledger entry',
    query: CreditLedgerValidations.getCreditLedgersValidation.shape.query,
    isAuth: true,
  });

  registerCreditLedger({
    method: 'get',
    path: '/credit-ledgers/:id',
    summary: 'Get a credit ledger entry',
    params: CreditLedgerValidations.creditLedgerIdValidation.shape.params,
    isAuth: true,
  });

  registerCreditLedger({
    method: 'get',
    path: '/credit-ledgers',
    summary: 'List my credit ledger',
    query: CreditLedgerValidations.getCreditLedgersValidation.shape.query,
    isAuth: true,
  });
}

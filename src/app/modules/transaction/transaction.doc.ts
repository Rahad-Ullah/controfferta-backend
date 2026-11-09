import { z } from '../../../api-docs/zod';
import { registerApiRoute } from '../../../helpers/openapi-helper';
import {
  TransactionGateway,
  TransactionStatus,
  TransactionType,
} from './transaction.constants';
import { TransactionValidations } from './transaction.validation';

const listQuery = {
  status: z.nativeEnum(TransactionStatus).optional(),
  type: z.nativeEnum(TransactionType).optional(),
  gateway: z.nativeEnum(TransactionGateway).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  sort: z.string().optional(),
  fields: z.string().optional(),
};

export function registerTransactionDocs() {
  const registerTransaction = (
    opts: Parameters<typeof registerApiRoute>[0],
  ) => {
    registerApiRoute({ tags: ['Transaction'], ...opts });
  };

  registerTransaction({
    method: 'patch',
    path: '/transactions/:id',
    summary: 'Update a transaction status',
    params:
      TransactionValidations.updateTransactionStatusValidation.shape.params,
    body: TransactionValidations.updateTransactionStatusValidation.shape.body,
    isAuth: true,
  });

  registerTransaction({
    method: 'get',
    path: '/transactions/single/:id',
    summary: 'Get a transaction',
    params: TransactionValidations.getSingleTransactionValidation.shape.params,
    isAuth: true,
  });

  registerTransaction({
    method: 'get',
    path: '/transactions/me',
    summary: 'List my transactions',
    query: z.object(listQuery).strict(),
    isAuth: true,
  });

  registerTransaction({
    method: 'get',
    path: '/transactions/all',
    summary: 'List every transaction',
    query: z
      .object({
        searchTerm: z.string().optional(),
        ...listQuery,
      })
      .strict(),
    isAuth: true,
  });
}

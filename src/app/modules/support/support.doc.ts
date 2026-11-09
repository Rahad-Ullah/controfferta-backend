import { registerApiRoute } from '../../../helpers/openapi-helper';
import { SupportValidations } from './support.validation';

export function registerSupportDocs() {
  const registerSupport = (opts: Parameters<typeof registerApiRoute>[0]) => {
    registerApiRoute({ tags: ['Support'], ...opts });
  };

  registerSupport({
    method: 'post',
    path: '/supports/create',
    summary: 'Send a support message',
    body: SupportValidations.createSupportValidation.shape.body,
  });

  registerSupport({
    method: 'patch',
    path: '/supports/:id',
    summary: 'Update a support message',
    params: SupportValidations.updateSupportValidation.shape.params,
    body: SupportValidations.updateSupportValidation.shape.body,
    isAuth: true,
  });

  registerSupport({
    method: 'delete',
    path: '/supports/:id',
    summary: 'Delete a support message',
    params: SupportValidations.supportIdValidation.shape.params,
    isAuth: true,
  });

  registerSupport({
    method: 'get',
    path: '/supports/all',
    summary: 'List support messages',
    query: SupportValidations.getSupportsValidation.shape.query,
    isAuth: true,
  });

  registerSupport({
    method: 'get',
    path: '/supports/:id',
    summary: 'Get a support message',
    params: SupportValidations.supportIdValidation.shape.params,
    isAuth: true,
  });
}

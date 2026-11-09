import { registerApiRoute } from '../../../helpers/openapi-helper';
import { LeadAccessValidations } from './leadAccess.validation';

export function registerLeadAccessDocs() {
  const registerLeadAccess = (
    opts: Parameters<typeof registerApiRoute>[0],
  ) => {
    registerApiRoute({ tags: ['Lead access'], ...opts });
  };

  registerLeadAccess({
    method: 'post',
    path: '/lead-accesses/unlock',
    summary: 'Unlock a lead',
    body: LeadAccessValidations.unlockLeadValidation.shape.body,
    isAuth: true,
  });

  registerLeadAccess({
    method: 'patch',
    path: '/lead-accesses/:id/status',
    summary: 'Update a lead access status',
    params: LeadAccessValidations.updateLeadAccessStatusValidation.shape.params,
    body: LeadAccessValidations.updateLeadAccessStatusValidation.shape.body,
    isAuth: true,
  });

  registerLeadAccess({
    method: 'get',
    path: '/lead-accesses/all',
    summary: 'List every lead access',
    query: LeadAccessValidations.getLeadAccessesValidation.shape.query,
    isAuth: true,
  });

  registerLeadAccess({
    method: 'get',
    path: '/lead-accesses/:id',
    summary: 'Get a lead access',
    params: LeadAccessValidations.leadAccessIdValidation.shape.params,
    isAuth: true,
  });

  registerLeadAccess({
    method: 'get',
    path: '/lead-accesses',
    summary: 'List my lead accesses',
    query: LeadAccessValidations.getLeadAccessesValidation.shape.query,
    isAuth: true,
  });
}

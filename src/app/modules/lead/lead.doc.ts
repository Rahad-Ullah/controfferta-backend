import { registerApiRoute } from '../../../helpers/openapi-helper';
import { LeadValidations } from './lead.validation';

export function registerLeadDocs() {
  const registerLead = (opts: Parameters<typeof registerApiRoute>[0]) => {
    registerApiRoute({ tags: ['Lead'], ...opts });
  };

  registerLead({
    method: 'post',
    path: '/leads/create',
    summary: 'Submit a project request',
    body: LeadValidations.createLeadValidation.shape.body,
  });

  registerLead({
    method: 'patch',
    path: '/leads/:id/status',
    summary: 'Review a lead',
    params: LeadValidations.updateLeadStatusValidation.shape.params,
    body: LeadValidations.updateLeadStatusValidation.shape.body,
    isAuth: true,
  });

  registerLead({
    method: 'delete',
    path: '/leads/:id',
    summary: 'Delete a lead',
    params: LeadValidations.leadIdValidation.shape.params,
    isAuth: true,
  });

  registerLead({
    method: 'get',
    path: '/leads',
    summary: 'Browse accepted leads',
    query: LeadValidations.leadFeedValidation.shape.query,
    isAuth: true,
  });

  registerLead({
    method: 'get',
    path: '/leads/all',
    summary: 'List leads for review',
    query: LeadValidations.getAllLeadsValidation.shape.query,
    isAuth: true,
  });

  registerLead({
    method: 'get',
    path: '/leads/:id',
    summary: 'Get a lead',
    params: LeadValidations.leadIdValidation.shape.params,
    isAuth: true,
  });
}

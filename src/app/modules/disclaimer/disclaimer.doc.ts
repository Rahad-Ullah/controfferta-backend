import { registerApiRoute } from '../../../helpers/openapi-helper';
import { DisclaimerValidations } from './disclaimer.validation';

export function registerDisclaimerDocs() {
  const registerDisclaimer = (opts: Parameters<typeof registerApiRoute>[0]) => {
    registerApiRoute({ tags: ['Disclaimer'], ...opts });
  };

  registerDisclaimer({
    method: 'post',
    path: '/disclaimers',
    summary: 'Create or update a disclaimer',
    body: DisclaimerValidations.createUpdateDisclaimerSchema.shape.body,
    isAuth: true,
  });

  registerDisclaimer({
    method: 'get',
    path: '/disclaimers/:type',
    summary: 'Get a disclaimer by type',
    params: DisclaimerValidations.getDisclaimerSchema.shape.params,
  });
}

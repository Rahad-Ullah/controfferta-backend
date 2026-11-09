import { registerApiRoute } from '../../../helpers/openapi-helper';
import { SettingValidations } from './setting.validation';

export function registerSettingDocs() {
  const registerSetting = (opts: Parameters<typeof registerApiRoute>[0]) => {
    registerApiRoute({ tags: ['Setting'], ...opts });
  };

  registerSetting({
    method: 'post',
    path: '/settings',
    summary: 'Update the platform settings',
    body: SettingValidations.updateSettingValidation.shape.body,
    isAuth: true,
  });

  registerSetting({
    method: 'get',
    path: '/settings',
    summary: 'Get the platform settings',
  });
}

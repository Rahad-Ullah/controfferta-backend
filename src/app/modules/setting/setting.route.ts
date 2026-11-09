import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { UserRole } from '../user/user.constant';
import { SettingController } from './setting.controller';
import { SettingValidations } from './setting.validation';

const router = express.Router();

// create or update setting
router.post(
  '/',
  auth(UserRole.Admin, UserRole.SuperAdmin),
  validateRequest(SettingValidations.updateSettingValidation),
  SettingController.createOrUpdateSetting,
);

// get setting
router.get('/', SettingController.getSetting);

export const settingRoutes = router;

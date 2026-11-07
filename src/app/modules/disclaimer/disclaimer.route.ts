import express from 'express';
import { DisclaimerController } from './disclaimer.controller';
import { DisclaimerValidations } from './disclaimer.validation';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '../user/user.constant';

const router = express.Router();

// create or update disclaimer
router.post(
    '/',
    auth(UserRole.Admin, UserRole.SuperAdmin),
    validateRequest(DisclaimerValidations.createUpdateDisclaimerSchema),
    DisclaimerController.createOrUpdateDisclaimer
);

// get disclaimer by type
router.get(
    '/:type',
    validateRequest(DisclaimerValidations.getDisclaimerSchema),
    DisclaimerController.getDisclaimerByType
);

export const disclaimerRoutes = router;
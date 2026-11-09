import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { UserRole } from '../user/user.constant';
import { LeadAccessController } from './leadAccess.controller';
import { LeadAccessValidations } from './leadAccess.validation';

const router = express.Router();

// unlock lead
router.post(
  '/unlock',
  auth(UserRole.Provider),
  validateRequest(LeadAccessValidations.unlockLeadValidation),
  LeadAccessController.unlockLeadController,
);

// update lead access status
router.patch(
  '/:id/status',
  auth(UserRole.Provider),
  validateRequest(LeadAccessValidations.updateLeadAccessStatusValidation),
  LeadAccessController.updateLeadAccessStatusController,
);

// get all lead accesses
router.get(
  '/all',
  auth(UserRole.Admin, UserRole.SuperAdmin),
  validateRequest(LeadAccessValidations.getLeadAccessesValidation),
  LeadAccessController.getAllLeadAccessesController,
);

// get lead access by id
router.get(
  '/:id',
  auth(UserRole.Provider, UserRole.Admin, UserRole.SuperAdmin),
  validateRequest(LeadAccessValidations.leadAccessIdValidation),
  LeadAccessController.getLeadAccessByIdController,
);

// get my lead accesses
router.get(
  '/',
  auth(UserRole.Provider),
  validateRequest(LeadAccessValidations.getLeadAccessesValidation),
  LeadAccessController.getMyLeadAccessesController,
);

export const leadAccessRoutes = router;

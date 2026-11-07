import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { UserRole } from '../user/user.constant';
import { LeadController } from './lead.controller';
import { LeadValidations } from './lead.validation';

const router = express.Router();

// create lead
router.post(
  '/create',
  validateRequest(LeadValidations.createLeadValidation),
  LeadController.createLeadController,
);

// update lead status
router.patch(
  '/:id/status',
  auth(UserRole.Admin, UserRole.SuperAdmin),
  validateRequest(LeadValidations.updateLeadStatusValidation),
  LeadController.updateLeadStatusController,
);

// delete lead
router.delete(
  '/:id',
  auth(UserRole.Admin, UserRole.SuperAdmin),
  validateRequest(LeadValidations.leadIdValidation),
  LeadController.deleteLeadController,
);

// get lead feed
router.get(
  '/',
  validateRequest(LeadValidations.leadFeedValidation),
  LeadController.getLeadFeedController,
);

// get all leads
router.get(
  '/all',
  auth(UserRole.Admin, UserRole.SuperAdmin),
  validateRequest(LeadValidations.getAllLeadsValidation),
  LeadController.getAllLeadsController,
);

// get lead by id
router.get(
  '/:id',
  auth(UserRole.Provider, UserRole.Admin, UserRole.SuperAdmin),
  validateRequest(LeadValidations.leadIdValidation),
  LeadController.getLeadByIdController,
);

export const leadRoutes = router;

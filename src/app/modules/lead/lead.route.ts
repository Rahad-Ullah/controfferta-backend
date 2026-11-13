import express from 'express';
import auth from '../../middlewares/auth';
import { rateLimiter } from '../../middlewares/rateLimit';
import validateRequest from '../../middlewares/validateRequest';
import { UserRole } from '../user/user.constant';
import { LeadController } from './lead.controller';
import { LeadValidations } from './lead.validation';

const router = express.Router();

const createLeadLimiter = rateLimiter({
  prefix: 'lead_create',
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  message: 'Too many lead submissions. Please try again later.',
});

// create lead
router.post(
  '/create',
  createLeadLimiter,
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
  auth(UserRole.Provider),
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

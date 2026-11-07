import express from 'express';
import { FaqController } from './faq.controller';
import validateRequest from '../../middlewares/validateRequest';
import { FaqValidations } from './faq.validation';
import auth from '../../middlewares/auth';
import { UserRole } from '../user/user.constant';

const router = express.Router();

// create faq
router.post(
    '/create',
    auth(UserRole.Admin, UserRole.SuperAdmin),
    validateRequest(FaqValidations.createFaqValidation),
    FaqController.createFaqController
);

// update faq
router.patch(
    '/:id',
    auth(UserRole.Admin, UserRole.SuperAdmin),
    validateRequest(FaqValidations.updateFaqValidation),
    FaqController.updateFaqController
);

// delete faq
router.delete(
    '/:id',
    auth(UserRole.Admin, UserRole.SuperAdmin),
    validateRequest(FaqValidations.deleteFaqValidation),
    FaqController.deleteFaqController
);

// get faq by id
router.get(
    '/:id',
    validateRequest(FaqValidations.getFaqByIdValidation),
    FaqController.getFaqByIdController
);

// get all faqs
router.get(
    '/',
    FaqController.getAllFaqsController
);

export const faqRoutes = router;
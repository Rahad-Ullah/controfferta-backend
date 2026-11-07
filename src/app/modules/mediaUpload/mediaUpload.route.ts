import express from 'express';
import { MediaUploadController } from './mediaUpload.controller';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { MediaUploadValidations } from './mediaUpload.validation';
import fileUploadHandler from '../../middlewares/fileUploadHandler';

const router = express.Router();

// upload media
router.post(
  '/upload',
  auth(),
  fileUploadHandler(),
  validateRequest(MediaUploadValidations.uploadMedia),
  MediaUploadController.uploadMedia,
);

export const mediaUploadRoutes = router;

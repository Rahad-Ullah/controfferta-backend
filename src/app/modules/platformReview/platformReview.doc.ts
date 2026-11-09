import { registerApiRoute } from '../../../helpers/openapi-helper';
import { PlatformReviewValidations } from './platformReview.validation';

export function registerPlatformReviewDocs() {
  const registerPlatformReview = (
    opts: Parameters<typeof registerApiRoute>[0],
  ) => {
    registerApiRoute({ tags: ['Platform review'], ...opts });
  };

  registerPlatformReview({
    method: 'post',
    path: '/platform-reviews/create',
    summary: 'Submit a platform review',
    body: PlatformReviewValidations.createPlatformReviewValidation.shape.body,
    isAuth: true,
  });

  registerPlatformReview({
    method: 'patch',
    path: '/platform-reviews/:id/status',
    summary: 'Update a platform review status',
    params:
      PlatformReviewValidations.updatePlatformReviewStatusValidation.shape
        .params,
    body: PlatformReviewValidations.updatePlatformReviewStatusValidation.shape
      .body,
    isAuth: true,
  });

  registerPlatformReview({
    method: 'delete',
    path: '/platform-reviews/:id',
    summary: 'Delete a platform review',
    params: PlatformReviewValidations.platformReviewIdValidation.shape.params,
    isAuth: true,
  });

  registerPlatformReview({
    method: 'get',
    path: '/platform-reviews/all',
    summary: 'List every platform review',
    query: PlatformReviewValidations.getAllPlatformReviewsValidation.shape.query,
    isAuth: true,
  });

  registerPlatformReview({
    method: 'get',
    path: '/platform-reviews/me',
    summary: 'List my platform reviews',
    query: PlatformReviewValidations.getPlatformReviewsValidation.shape.query,
    isAuth: true,
  });

  registerPlatformReview({
    method: 'get',
    path: '/platform-reviews/:id',
    summary: 'Get a published platform review',
    params: PlatformReviewValidations.platformReviewIdValidation.shape.params,
  });

  registerPlatformReview({
    method: 'get',
    path: '/platform-reviews',
    summary: 'List published platform reviews',
    query: PlatformReviewValidations.getPlatformReviewsValidation.shape.query,
  });
}

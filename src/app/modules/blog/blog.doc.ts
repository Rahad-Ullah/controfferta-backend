import { registerApiRoute } from '../../../helpers/openapi-helper';
import { BlogValidations } from './blog.validation';

export function registerBlogDocs() {
  const registerBlog = (opts: Parameters<typeof registerApiRoute>[0]) => {
    registerApiRoute({ tags: ['Blog'], ...opts });
  };

  registerBlog({
    method: 'post',
    path: '/blogs/create',
    summary: 'Create a blog post',
    body: BlogValidations.createBlogValidation.shape.body,
    isAuth: true,
  });

  registerBlog({
    method: 'patch',
    path: '/blogs/:id/status',
    summary: 'Update a blog status',
    params: BlogValidations.updateBlogStatusValidation.shape.params,
    body: BlogValidations.updateBlogStatusValidation.shape.body,
    isAuth: true,
  });

  registerBlog({
    method: 'patch',
    path: '/blogs/:id',
    summary: 'Update a blog post',
    params: BlogValidations.updateBlogValidation.shape.params,
    body: BlogValidations.updateBlogValidation.shape.body,
    isAuth: true,
  });

  registerBlog({
    method: 'delete',
    path: '/blogs/:id',
    summary: 'Delete a blog post',
    params: BlogValidations.blogIdValidation.shape.params,
    isAuth: true,
  });

  registerBlog({
    method: 'get',
    path: '/blogs/all',
    summary: 'List every blog post',
    query: BlogValidations.getAllBlogsValidation.shape.query,
    isAuth: true,
  });

  registerBlog({
    method: 'get',
    path: '/blogs/:id',
    summary: 'Get a published blog post',
    params: BlogValidations.blogIdValidation.shape.params,
  });

  registerBlog({
    method: 'get',
    path: '/blogs',
    summary: 'List published blog posts',
    query: BlogValidations.getBlogsValidation.shape.query,
  });
}

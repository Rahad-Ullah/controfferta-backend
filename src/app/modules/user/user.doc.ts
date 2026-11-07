import { registerApiRoute } from '../../../helpers/openapi-helper';
import { UserValidation } from './user.validation';

export function registerUserDocs() {
  const registerUser = (opts: Parameters<typeof registerApiRoute>[0]) => {
    registerApiRoute({ tags: ['User'], ...opts });
  };

  // sign-up / register
  registerUser({
    method: 'post',
    path: '/users/register',
    summary: 'Client or provider registration',
    body: UserValidation.createUserZodSchema.shape.body,
  });

  // update profile
  registerUser({
    method: 'patch',
    path: '/users/me',
    summary: 'Update profile',
    body: UserValidation.updateUserZodSchema.shape.body,
    isAuth: true,
  });

  // update user status
  registerUser({
    method: 'patch',
    path: '/users/:id/status',
    summary: 'Update user status',
    params: UserValidation.updateStatusZodSchema.shape.params,
    body: UserValidation.updateStatusZodSchema.shape.body,
    isAuth: true,
  });

  // delete user
  registerUser({
    method: 'delete',
    path: '/users/:id',
    summary: 'Delete user',
    params: UserValidation.deleteUserZodSchema.shape.params,
    isAuth: true,
  });

  // get profile
  registerUser({
    method: 'get',
    path: '/users/me',
    summary: 'Get profile',
    isAuth: true,
  });

  // get user by id
  registerUser({
    method: 'get',
    path: '/users/:id',
    summary: 'Get user by id',
    params: UserValidation.getSingleUserZodSchema.shape.params,
    isAuth: true,
  });

  // get all users
  registerUser({
    method: 'get',
    path: '/users',
    summary: 'Get all users',
    query: UserValidation.getAllUsersZodSchema.shape.query,
    isAuth: true,
  });
}

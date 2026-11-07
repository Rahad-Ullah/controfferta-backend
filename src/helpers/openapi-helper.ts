import { registry } from '../api-docs/openapi';
import { AnyZodObject, ZodType } from 'zod';

interface RegisterRouteOptions {
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  path: string;
  tags?: string[];
  summary: string;
  body?: ZodType<any>;
  query?: AnyZodObject;
  params?: AnyZodObject;
  headers?: AnyZodObject;
  isAuth?: boolean;
  successDescription?: string;
}

export function registerApiRoute({
  method,
  path,
  tags,
  summary,
  body,
  query,
  params,
  headers,
  isAuth = false,
  successDescription = 'Success',
}: RegisterRouteOptions) {
  // Converts Express-style "/users/:id" to OpenAPI-style "/users/{id}"
  const openApiPath = path.replace(/:([a-zA-Z0-9_]+)/g, '{$1}');

  registry.registerPath({
    method,
    path: openApiPath,
    tags,
    summary,
    ...(isAuth && { security: [{ bearerAuth: [] }] }),
    request: {
      ...(params && { params }),
      ...(query && { query }),
      ...(headers && { headers }),
      ...(body && {
        body: {
          content: {
            'application/json': { schema: body },
          },
        },
      }),
    },
    responses: {
      200: { description: successDescription },
      400: { description: 'Validation failed or invalid input' },
      ...(isAuth && { 401: { description: 'Unauthorized access' } }),
    },
  });
}

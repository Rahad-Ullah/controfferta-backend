import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from '@asteasolutions/zod-to-openapi';
import { registerAuthDocs } from '../app/modules/auth/auth.doc';
import { registerUserDocs } from '../app/modules/user/user.doc';
import config from '../config';

export const registry = new OpenAPIRegistry();

// Register Bearer Auth (optional, for secured endpoints)
registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});

export function generateOpenApiDocumentV1() {
  registerAuthDocs();
  registerUserDocs();

  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: '3.0.3',
    info: {
      title: `${config.server_name} Backend API`,
      version: '1.0.0',
      description: 'API documentation generated automatically from Zod schemas',
    },
    servers: [{ url: '/api/v1' }],
  });
}

import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from '@asteasolutions/zod-to-openapi';
import { registerAuthDocs } from '../app/modules/auth/auth.doc';
import { registerCategoryDocs } from '../app/modules/category/category.doc';
import { registerCreditPackageDocs } from '../app/modules/creditPackage/creditPackage.doc';
import { registerCreditPurchaseDocs } from '../app/modules/creditPurchase/creditPurchase.doc';
import { registerCreditLedgerDocs } from '../app/modules/creditLedger/creditLedger.doc';
import { registerLeadDocs } from '../app/modules/lead/lead.doc';
import { registerLeadAccessDocs } from '../app/modules/leadAccess/leadAccess.doc';
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
  registerCategoryDocs();
  registerLeadDocs();
  registerLeadAccessDocs();
  registerCreditPackageDocs();
  registerCreditPurchaseDocs();
  registerCreditLedgerDocs();

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

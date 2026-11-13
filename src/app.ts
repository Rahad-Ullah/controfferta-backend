import express, { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import globalErrorHandler from './app/middlewares/globalErrorHandler';
import { stripeWebhookController } from './app/webhooks/stripe/stripe.controller';
import { generateOpenApiDocumentV1 } from './api-docs/openapi';
import { Morgan } from './shared/morgen';
import config from './config';
import router from './routes';

const app = express();

// One proxy hop. A client-supplied X-Forwarded-For is not req.ip.
app.set('trust proxy', 1);

const isProduction = config.node_env === 'production';
app.use(
  helmet({
    contentSecurityPolicy: isProduction,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    hsts: isProduction ? undefined : false,
  }),
);

// morgan
app.use(Morgan.successHandler);
app.use(Morgan.errorHandler);

// stripe webhook
app.post(
  '/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  stripeWebhookController,
);

// body parser
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// api router
app.use('/api/v1', router);

// api docs
if (!isProduction) {
  const openApiDocV1 = generateOpenApiDocumentV1();

  app.get('/api-docs/v1.json', (_req, res) => res.json(openApiDocV1));

  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(null, {
      swaggerOptions: {
        urls: [
          { url: '/api-docs/v1.json', name: 'v1.0.0 (Latest)' },
          // new version will be added here
        ],
      },
    }),
  );
}

//live response
app.get('/', (req: Request, res: Response) => {
  const date = new Date(Date.now());
  res.send(
    `<h1 style="text-align:center; color:#173616; font-family:Verdana;">Beep-beep! The ${config.server_name} server is alive and flying 🚀</h1>
    <p style="text-align:center; color:#173616; font-family:Verdana;">${date}</p>
    `,
  );
});

//global error handle
app.use(globalErrorHandler);

//handle not found route;
app.use((req, res) => {
  res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    message: 'Not found',
    errorMessages: [
      {
        path: req.originalUrl,
        message: "API DOESN'T EXIST",
      },
    ],
  });
});

export default app;

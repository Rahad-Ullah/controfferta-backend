# Testing Strategy

**Project:** `controfferta-backend`  
**Status:** Implemented. `npm test` runs Vitest 3 via `vitest.config.mts`. External services are mocked in `tests/setup.ts`. MongoDB uses an in-memory replica set.  
**Stack:** Node.js, Express, TypeScript, MongoDB (Mongoose), Redis, BullMQ, AWS S3, Stripe, Nodemailer, Elasticsearch, Socket.IO

---

## 1. Approach

Use an integration-first suite, following the testing trophy.

```
       /  E2E (Smoke)  \       (~5%)
      /-----------------\
     /   Integration     \     (~65%)
    /---------------------\
   /      Unit Tests       \   (~25%)
  /-------------------------\
 /   Static (TS / Lint)      \ (~5%)
```

Integration tests are the default because `src/app.ts` builds the Express app without listening on a port or connecting to MongoDB. Those side effects live in `src/server.ts` and `src/dev-server.ts`. A test can import `app` and call it with Supertest.

Mocking Mongoose query chains or `req` / `res` does not check schema rules, indexes, hooks, or the real error handler. `mongodb-memory-server` runs the real query path:

HTTP request → auth and role checks → Zod → controller → service → Mongoose → HTTP response

---

## 2. What to test

### API integration (~65%)

Cover the mounted routers in `src/routes/index.ts`, plus the Stripe webhook mounted in `src/app.ts`.

| Area | Routes | What to assert |
| :--- | :--- | :--- |
| Auth | `/api/v1/auth` | Login, refresh, forget-password, OTP, verify-email, reset-password, change-password. `401` without a token. `400` for Zod failures and bad credentials. `407` when the email is not verified. |
| Users | `/api/v1/users` | Register accepts role `user` only. Profile read and update. Admin and super admin can list users, change status, and delete. A normal user cannot. |
| Admins | `/api/v1/admins` | Only `super_admin` can create or update an admin. Creating an admin sets `roleRef`. |
| Wallet | `/api/v1/wallets` | A `user` can connect a Stripe payout method, read their wallet, and request a withdrawal. Stripe calls stay mocked. Currency is USD. |
| Transactions | `/api/v1/transactions` | A user reads their own transactions. An admin updates status and lists all transactions. Reference types are `Order` and `Wallet`. |
| Stripe webhook | `POST /webhooks/stripe` | Raw body and signature check. Handled events are listed in section 6. A repeated event id is ignored. |
| Support | `/api/v1/supports` | A `user` creates and lists their tickets. An admin updates a ticket and lists all tickets. |
| FAQ, disclaimer, settings | `/api/v1/faqs`, `/api/v1/disclaimers`, `/api/v1/settings` | Public reads where the route allows them. Writes require `admin` or `super_admin`. |
| Chat and messages | `/api/v1/chats`, `/api/v1/messages` | Authenticated create and list. A user only sees their own chats. |
| Notifications | `/api/v1/notifications` | Authenticated list, mark one read, mark all read. |
| Media uploads | `/api/v1/media-uploads` | Authenticated upload. S3 and the BullMQ cleanup job are mocked. |

Roles are `user`, `admin`, and `super_admin` (`src/app/modules/user/user.constant.ts`).

Also assert the shared error shape from `globalErrorHandler`: `success: false`, `message`, and `errorMessages` on validation failures.

### Unit tests (~25%)

Test code that does not need Express or a database:

- `src/app/builder/QueryBuilder.ts` for search, filter, sort, and pagination
- `src/app/builder/ElasticQueryBuilder.ts` against a mocked client
- `src/helpers/jwtHelper.ts`
- `src/helpers/cryptoHelper.ts`
- `src/utils/generateOTP.ts` and `src/utils/generateSlug.ts`
- Wallet balance checks that reject a withdrawal above `availableBalance`
- Stripe fee and net-amount math inside the webhook service, given a fixed balance transaction

### Workers, webhooks, and sockets (~10%)

- Call `notification.worker.ts` and `mediaUpload.worker.ts` with a fake BullMQ `Job`. Do not start Redis.
- Drive `stripeEventHandler` with the event types it actually switches on:
  - `checkout.session.completed`
  - `checkout.session.async_payment_succeeded`
  - `checkout.session.async_payment_failed`
  - `checkout.session.expired`
  - `charge.refunded`
  - `refund.failed`
  - `account.updated`
  - `transfer.created`
  - `transfer.reversed`
- Checkout metadata is `userId`, `referenceType`, and `referenceId`. Transfer metadata is `userId`, `walletId`, and `txnId`.
- Socket coverage can wait. When added, exercise `room:join`, `room:leave`, and `disconnect` in `src/helpers/socketHelper.ts` with a mocked Socket.IO socket. Do not open a live server.

---

## 3. Tools

| Role | Tool | Why |
| :--- | :--- | :--- |
| Test runner | Vitest | TypeScript via esbuild, Jest-style `describe` / `it` / `expect` / `vi`, fast watch mode. |
| HTTP | Supertest | Calls the Express app without binding a port. |
| Database | `mongodb-memory-server` | Real MongoDB, local and in CI, thrown away after the run. |
| Coverage | `@vitest/coverage-v8` | V8 coverage with text, JSON, and HTML reports. |

None of these are in `package.json` today. Phase 1 installs them.

Jest with `@swc/jest` is a valid alternative if a later project standard requires Jest. Vitest needs less setup for this TypeScript app.

---

## 4. What stays real, what gets mocked

Tests must not call Stripe, S3, Elasticsearch, Redis, or an SMTP server.

```
       +---------------------------------------------+
       |             Test Suite Execution            |
       +---------------------------------------------+
              |                              |
       [Real Execution]               [Mocked Boundaries]
              |                              |
     +-----------------+          +---------------------+
     | Express App     |          | BullMQ              |
     | Zod Validation  |          | ioredis             |
     | Mongoose Models |          | Elasticsearch       |
     | Memory MongoDB  |          | AWS S3              |
     +-----------------+          | Nodemailer          |
                                  | Stripe SDK          |
                                  +---------------------+
```

1. **MongoDB.** Real queries against `mongodb-memory-server`.
2. **BullMQ and ioredis.** Stubs so queues and the Redis rate limiter never open a socket. This app does not use Redlock.
3. **Elasticsearch.** Stub `src/config/elastic-search.ts` so importing a search helper does not ping a cluster.
4. **AWS S3.** Stub `S3Client.send` so uploads and deletes do not touch a bucket.
5. **Nodemailer.** Spy on `sendMail` to assert OTP and password emails without sending them.
6. **Stripe.** Stub Checkout, PaymentIntents, refunds, accounts, account links, transfers, and `webhooks.constructEvent`.

`src/config/stripe.ts` throws on import when `STRIPE_SECRET_KEY` or `STRIPE_API_VERSION` is missing. `src/app.ts` imports the webhook controller, which imports that file. Vitest must set those variables before the app module loads.

---

## 5. Directory layout

```text
controfferta-backend/
├── .github/
│   └── workflows/
│       ├── docker-publish.yml
│       └── test.yml
├── docs/
│   └── testing-strategy.md
├── tests/
│   ├── setup.ts
│   ├── helpers/
│   │   ├── auth.helper.ts
│   │   └── db.helper.ts
│   ├── mocks/
│   │   ├── bullmq.mock.ts
│   │   ├── redis.mock.ts
│   │   ├── elastic.mock.ts
│   │   ├── nodemailer.mock.ts
│   │   ├── s3.mock.ts
│   │   └── stripe.mock.ts
│   └── integration/
│       ├── auth.test.ts
│       ├── user.test.ts
│       ├── admin.test.ts
│       ├── wallet.test.ts
│       ├── transaction.test.ts
│       ├── stripe.webhook.test.ts
│       ├── support.test.ts
│       └── mediaUpload.test.ts
├── src/
│   └── app/
│       └── builder/
│           └── QueryBuilder.spec.ts
├── vitest.config.ts
└── package.json
```

Keep spies in `tests/mocks/` instead of inlining them in `tests/setup.ts`. A test can then assert a side effect directly:

```typescript
expect(sendMailSpy).toHaveBeenCalledWith(
  expect.objectContaining({ to: 'jane.doe@example.com' }),
);
```

When BullMQ or the Stripe SDK changes, only the matching mock file changes.

---

## 6. Reference templates

### 6.1. `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 20000,
    hookTimeout: 20000,
    include: ['tests/**/*.test.ts', 'src/**/*.{spec,test}.ts'],
    env: {
      NODE_ENV: 'test',
      BCRYPT_SALT_ROUNDS: '10',
      JWT_SECRET: 'test_jwt_secret',
      JWT_EXPIRE_IN: '1d',
      JWT_REFRESH_SECRET: 'test_jwt_refresh_secret',
      JWT_REFRESH_EXPIRE_IN: '7d',
      STRIPE_SECRET_KEY: 'sk_test_mock',
      STRIPE_API_VERSION: '2024-06-20',
      STRIPE_WEBHOOK_SECRET: 'whsec_test_mock',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'dist/**',
        'node_modules/**',
        'tests/**',
        'src/server.ts',
        'src/dev-server.ts',
      ],
    },
  },
});
```

`NODE_ENV=test` makes login failures return `Invalid email or password` instead of the development-only messages.

### 6.2. Mocks

#### `tests/mocks/bullmq.mock.ts`

```typescript
import { vi } from 'vitest';

export const queueAddSpy = vi.fn().mockResolvedValue({ id: 'mock-job-id' });

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: queueAddSpy,
    close: vi.fn().mockResolvedValue(undefined),
  })),
  Worker: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  })),
  QueueEvents: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  })),
  Job: vi.fn().mockImplementation(() => ({
    id: 'mock-job-id',
    data: {},
    updateProgress: vi.fn().mockResolvedValue(undefined),
  })),
}));
```

#### `tests/mocks/redis.mock.ts`

```typescript
import { vi } from 'vitest';

vi.mock('ioredis', () => {
  const RedisMock = vi.fn().mockImplementation(() => ({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    quit: vi.fn().mockResolvedValue('OK'),
    disconnect: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    status: 'ready',
    call: vi.fn().mockResolvedValue('OK'),
  }));

  return {
    default: RedisMock,
    Redis: RedisMock,
  };
});
```

#### `tests/mocks/elastic.mock.ts`

```typescript
import { vi } from 'vitest';

export const elasticSearchMock = {
  index: vi.fn().mockResolvedValue({ result: 'created' }),
  search: vi.fn().mockResolvedValue({
    hits: { hits: [], total: { value: 0 } },
  }),
  update: vi.fn().mockResolvedValue({ result: 'updated' }),
  delete: vi.fn().mockResolvedValue({ result: 'deleted' }),
  ping: vi.fn().mockResolvedValue(true),
  close: vi.fn().mockResolvedValue(undefined),
};

vi.mock('../../src/config/elastic-search', () => ({
  elasticSearch: elasticSearchMock,
}));
```

#### `tests/mocks/nodemailer.mock.ts`

```typescript
import { vi } from 'vitest';

export const sendMailSpy = vi
  .fn()
  .mockResolvedValue({ messageId: 'mock-email-id' });

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn().mockReturnValue({
      sendMail: sendMailSpy,
      verify: vi.fn().mockResolvedValue(true),
    }),
  },
}));
```

#### `tests/mocks/s3.mock.ts`

```typescript
import { vi } from 'vitest';

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue({}),
  })),
  PutObjectCommand: vi.fn().mockImplementation(args => args),
  DeleteObjectCommand: vi.fn().mockImplementation(args => args),
}));
```

#### `tests/mocks/stripe.mock.ts`

```typescript
import { vi } from 'vitest';

export const stripeMock = {
  checkout: {
    sessions: {
      create: vi.fn().mockResolvedValue({
        id: 'cs_test_mock123',
        url: 'https://checkout.stripe.com/pay/mock',
      }),
    },
  },
  paymentIntents: {
    retrieve: vi.fn().mockResolvedValue({
      id: 'pi_test_mock123',
      latest_charge: {
        id: 'ch_test_mock123',
        balance_transaction: {
          id: 'txn_test_mock123',
          amount: 5000,
          fee: 100,
          net: 4900,
        },
      },
    }),
  },
  accounts: {
    create: vi.fn().mockResolvedValue({ id: 'acct_test_mock123' }),
  },
  accountLinks: {
    create: vi.fn().mockResolvedValue({
      url: 'https://connect.stripe.com/setup/mock',
    }),
  },
  transfers: {
    create: vi.fn().mockResolvedValue({ id: 'tr_test_mock123' }),
  },
  refunds: {
    create: vi.fn().mockResolvedValue({
      id: 're_test_mock123',
      status: 'succeeded',
    }),
  },
  balance: {
    retrieve: vi.fn().mockResolvedValue({
      available: [{ amount: 100000, currency: 'usd' }],
    }),
  },
  webhooks: {
    constructEvent: vi.fn().mockImplementation((_body, signature) => {
      if (signature && String(signature).includes('invalid')) {
        throw new Error('Invalid signature');
      }

      return {
        id: 'evt_test_mock123',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_mock123',
            payment_status: 'paid',
            currency: 'usd',
            payment_intent: 'pi_test_mock123',
            payment_method_types: ['card'],
            metadata: {
              userId: '665f1234567890abcdef1234',
              referenceType: 'Order',
              referenceId: '665f1234567890abcdef5678',
            },
          },
        },
      };
    }),
  },
};

vi.mock('../../src/config/stripe', () => ({
  stripe: stripeMock,
}));
```

### 6.3. `tests/setup.ts`

```typescript
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll } from 'vitest';

import './mocks/bullmq.mock';
import './mocks/redis.mock';
import './mocks/elastic.mock';
import './mocks/nodemailer.mock';
import './mocks/s3.mock';
import './mocks/stripe.mock';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});
```

`User.create` hashes the password in a `pre('save')` hook, so login tests can store the plain password and send that same string to `/auth/login`.

### 6.4. `tests/helpers/auth.helper.ts`

```typescript
import { Secret } from 'jsonwebtoken';
import config from '../../src/config';
import { jwtHelper } from '../../src/helpers/jwtHelper';
import { UserRole } from '../../src/app/modules/user/user.constant';

export const createTestToken = (
  role: UserRole = UserRole.Client,
  userId: string = '665f1234567890abcdef1234',
  email: string = 'jane.doe@example.com',
): string => {
  return jwtHelper.createToken(
    { id: userId, role, email },
    config.jwt.jwt_secret as Secret,
    config.jwt.jwt_expire_in || '1h',
  );
};
```

### 6.5. `tests/integration/auth.test.ts`

```typescript
import request from 'supertest';
import { describe, expect, it, beforeEach } from 'vitest';
import app from '../../src/app';
import { User } from '../../src/app/modules/user/user.model';
import { UserRole, UserStatus } from '../../src/app/modules/user/user.constant';
import { createTestToken } from '../helpers/auth.helper';

describe('Auth API', () => {
  const testUserData = {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane.doe@example.com',
    password: 'Password123!',
    role: UserRole.User,
    isEmailVerified: true,
    status: UserStatus.Active,
  };

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await User.create(testUserData);
    });

    it('returns 400 when the password is missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'jane.doe@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errorMessages).toBeDefined();
    });

    it('returns 400 when the email format is invalid', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'not-an-email',
        password: 'Password123!',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 when the user does not exist', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'unknown@example.com',
        password: 'Password123!',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('returns 400 when the password is wrong', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: testUserData.email,
        password: 'WrongPassword999!',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('returns 407 when the email is not verified', async () => {
      await User.updateOne(
        { email: testUserData.email },
        { isEmailVerified: false },
      );

      const res = await request(app).post('/api/v1/auth/login').send({
        email: testUserData.email,
        password: testUserData.password,
      });

      expect(res.status).toBe(407);
      expect(res.body.message).toMatch(/verify your account/i);
    });

    it('returns access and refresh tokens for valid credentials', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: testUserData.email,
        password: testUserData.password,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('User logged in successfully.');
      expect(res.body.data).toMatchObject({
        role: UserRole.User,
        email: testUserData.email,
      });
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
    });
  });

  describe('POST /api/v1/auth/change-password', () => {
    let userToken: string;

    beforeEach(async () => {
      const createdUser = await User.create(testUserData);
      userToken = createTestToken(
        UserRole.User,
        createdUser._id.toString(),
        createdUser.email,
      );
    });

    it('returns 401 when the request has no token', async () => {
      const res = await request(app).post('/api/v1/auth/change-password').send({
        currentPassword: 'Password123!',
        newPassword: 'NewPassword456!',
        confirmPassword: 'NewPassword456!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('changes the password and accepts the new one on login', async () => {
      const res = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: 'Password123!',
          newPassword: 'NewPassword456!',
          confirmPassword: 'NewPassword456!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe(
        'Your password has been successfully changed',
      );

      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: testUserData.email,
        password: 'NewPassword456!',
      });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data).toHaveProperty('accessToken');
    });
  });
});
```

Confirm the change-password body against `AuthValidation.createChangePasswordZodSchema` before treating field names as final. The login cases match `auth.controller.ts` and `auth.service.ts`.

---

## 7. Rollout

### Phase 1: Runner and mocks

```bash
npm install -D vitest supertest @types/supertest mongodb-memory-server @vitest/coverage-v8 @vitest/ui
```

Then add `vitest.config.ts`, `tests/setup.ts`, `tests/mocks/*`, and `tests/helpers/auth.helper.ts`.

Replace the placeholder test script:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

### Phase 2: Critical API paths

1. Auth: login, refresh, forget-password, verify-email, reset-password, change-password.
2. Users: register with role `user`, reject any other public role, profile update, admin-only status and delete.
3. Admins: super-admin-only create and update, including `roleRef`.
4. Wallet and transactions: Stripe Connect onboarding URL, withdrawal against a mocked balance, user versus admin access.
5. Stripe webhook: valid signature, invalid signature, one happy-path event, and a duplicate event id.

### Phase 3: The rest of the platform modules

- Support, FAQ, disclaimer, and settings, including admin write guards.
- Chat, messages, and notifications.
- Media upload with the S3 mock and `queueAddSpy`.
- Unit tests for `QueryBuilder`, `jwtHelper`, and `cryptoHelper`.
- Worker processors with a fake job object.

### Phase 4: CI

Add `.github/workflows/test.yml`. The repo already publishes a Docker image from `.github/workflows/docker-publish.yml`. This workflow only lints and tests.

```yaml
name: Test

on:
  push:
    branches:
      - main
      - master
  pull_request:

jobs:
  test:
    name: Lint and test
    runs-on: ubuntu-latest

    env:
      NODE_ENV: test
      PORT: 5000
      BCRYPT_SALT_ROUNDS: 10
      JWT_SECRET: test_jwt_secret
      JWT_EXPIRE_IN: 1d
      JWT_REFRESH_SECRET: test_jwt_refresh_secret
      JWT_REFRESH_EXPIRE_IN: 7d
      STRIPE_SECRET_KEY: sk_test_mock
      STRIPE_API_VERSION: 2024-06-20
      STRIPE_WEBHOOK_SECRET: whsec_test_mock
      AWS_REGION: us-east-1
      AWS_ACCESS_KEY_ID: test_mock_aws_access_key
      AWS_SECRET_ACCESS_KEY: test_mock_aws_secret_key
      S3_BUCKET_NAME: test-bucket
      ELASTICSEARCH_NODE: http://127.0.0.1:9200

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint:check

      - name: Test
        run: npm run test:coverage

      - name: Upload coverage
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-coverage-report
          path: coverage/
          retention-days: 14
```

`npm run lint:check` currently has no path argument in `package.json`. Fix that script to lint `src` before this workflow is expected to pass.

---

## 8. Rules

1. Let `afterEach` wipe every collection. A test must not depend on data left by another test.
2. Do not mock Mongoose in integration tests. The memory server is what catches schema, index, and hook bugs.
3. Do not call Stripe, S3, Redis, Elasticsearch, or SMTP. Keep those stubs in `tests/mocks/`.
4. Assert status codes, response bodies, and documents written to MongoDB. Spy on a mock only when the behavior is a side effect, such as an email or a queued job.
5. When a new module is added with `npm run cm`, add an integration file for its routes and extend the OpenAPI registration only if that module gets Zod docs.

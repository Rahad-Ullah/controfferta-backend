# Agent instructions

This is the Express and TypeScript API for Controfferta. Write code the next person can read, keep the current layout, and prove the change with tests before you finish.

## Before editing

1. Read the module you are changing and one neighboring module that already does the same kind of work.
2. Change only what the task needs. Leave unrelated files, names, and response messages alone.
3. Reuse what is already here: Zod, Mongoose, `catchAsync`, `sendResponse`, `ApiError`, `QueryBuilder`, BullMQ, Stripe, S3, Redis, Elasticsearch. Do not add a library for a problem the stack already solves.

## Project layout

Keep new code in the same places as the existing code.

| Concern | Where it lives |
| :--- | :--- |
| Express app, no port and no database connection | `src/app.ts` |
| Process entry | `src/server.ts`, `src/dev-server.ts` |
| Mounted API routers | `src/routes/index.ts`, prefix `/api/v1` |
| Feature module | `src/app/modules/<camelName>/` |
| Shared HTTP helpers | `src/shared/` |
| Auth, validation, uploads, rate limit | `src/app/middlewares/` |
| Env and third-party clients | `src/config/` |
| JWT, crypto, sockets | `src/helpers/` |
| OpenAPI | `src/api-docs/` and `<module>.doc.ts` |
| Stripe webhook | `src/app/webhooks/stripe/` |
| Tests | `tests/integration`, `tests/unit`, `tests/workers`, `tests/helpers` |
| Domain model for new modules | `docs/erd.md` |

A module uses these files, named after the folder:

`interface`, `model`, `validation`, `service`, `controller`, `route`, and `constants` when the module has enums or fixed values.

Create a module with `npm run cm <name>`. The script writes those files and registers the router. Fill the generated files in. Do not invent a second folder shape such as `controllers/` or `services/` at the repo root.

Roles are `client`, `provider`, `admin`, and `super_admin` from `UserRole` in `src/app/modules/user/user.constant.ts`. Public signup accepts `client` and `provider`. Admins are created by a super admin. New domain modules follow `docs/erd.md`.

## How a request is written

Follow this order on every route:

`auth(...)` when the route is protected, then `validateRequest(schema)`, then the controller.

```typescript
router.post(
  '/create',
  auth(UserRole.Admin, UserRole.SuperAdmin),
  validateRequest(FaqValidations.createFaqValidation),
  FaqController.createFaqController,
);
```

Controllers stay thin. Wrap them in `catchAsync`, call one service method, and return `sendResponse` with `StatusCodes`, `success`, `message`, and `data`.

Services own the business rules. Throw `new ApiError(StatusCodes.NOT_FOUND, 'FAQ not found')` for expected failures. Do not catch an error only to hide it. Let `globalErrorHandler` shape the HTTP error.

Validation lives in the module's `validation` file as a Zod schema. Do not validate the same body again by hand inside the service.

List endpoints that already use `QueryBuilder` or `ElasticQueryBuilder` should keep using that builder. Do not replace it with a one-off query.

## Readability

- Name functions for the action: `createFaqService`, `getMyWallet`. A reader should know the job without opening the body.
- Prefer a plain early return over nested conditionals.
- Keep a function on one job. If a service method validates, writes, sends mail, and formats the HTTP body, split the HTTP part back into the controller.
- Match the surrounding file's style. Prettier is the formatter: semicolons, single quotes, and `arrowParens: avoid`.
- Comment only when the reason is not visible in the code, such as why a webhook must read the raw body.
- Use existing status codes and message wording when you touch an existing route. Tests and clients depend on them.

## Leave working behavior in place

- Do not change a public path, status code, success flag, or error message unless the task says to.
- Do not drop `auth` or widen who can call an admin route.
- Do not parse JSON before `POST /webhooks/stripe`. That route uses `express.raw` in `src/app.ts` so Stripe can verify the signature.
- Do not call `abortTransaction()` after `commitTransaction()`. Abort only when `session.inTransaction()` is true.
- Do not point tests at live Stripe, S3, Redis, Elasticsearch, or SMTP. Those clients are mocked in `tests/setup.ts`.
- Do not log or commit secrets from `.env`.

When a change can affect another caller, read that caller before editing. Examples: a user field used by auth, a wallet field used by the Stripe webhook, a queue payload used by a worker.

## After writing

Run the checks that cover the change. Do not finish on an untested edit.

```bash
npx tsc --noEmit
npm test
```

For a single area, run that file, then the full suite if the change touches shared code (`app.ts`, auth, user model, config, setup):

```bash
npx vitest run tests/integration/faq.test.ts
```

Add or update a test for the new behavior:

- HTTP changes go in `tests/integration` and call `app` through Supertest.
- Pure helpers go in `tests/unit`.
- Workers get a fake BullMQ job in `tests/workers`.
- Assert the status, the response message, and the document that was written. Include the failure path: missing token is `401`, wrong role is `403`, bad body is `400` with `success: false` and `errorMessages`.

`npm run test:watch` reruns on save. `npm run test:ui` opens the Vitest UI. `npm run test:coverage` writes the coverage report.

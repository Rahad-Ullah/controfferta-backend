# Controfferta backend

API for [Controfferta.it](https://controfferta.it/), the Italian marketplace that matches private clients with verified companies in renovations, solar, plants, windows, and roofing.

A **client** asks for a counter-offer. A **provider** is a partner company. Staff accounts are **admin** and **super admin**, and a super admin creates admins.

## Stack

- TypeScript, Node.js, Express.js
- MongoDB and Mongoose
- Zod validation and OpenAPI (Swagger UI)
- JWT and bcrypt
- Nodemailer
- Redis, BullMQ, and rate limiting
- Socket.IO
- AWS S3 uploads
- Stripe
- Elasticsearch
- Winston and Morgan
- ESLint and Prettier

## Included modules

Auth, users, admins, notifications, media uploads, chat, messages, wallets, transactions, support tickets, FAQs, disclaimers, and platform settings.

Add a new module with:

```bash
npm run cm
```

## Prerequisites

- Node.js
- npm or yarn
- MongoDB
- Redis
- Elasticsearch

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and replace the placeholder secrets.

3. Start the dev server:

```bash
npm run dev
```

Production:

```bash
npm run build
npm start
```

- API base path: `/api/v1`
- Swagger UI: `/api-docs`
- OpenAPI JSON: `/api-docs/v1.json`
- Stripe webhook: `/webhooks/stripe`

## Commits

This repo uses Conventional Commits through Commitizen.

```bash
git add .
npm run commit
```

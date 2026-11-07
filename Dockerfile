# ----------------------------------------
# 1. Base: Shared OS & Node Dependencies
# ----------------------------------------
FROM node:22-alpine AS base

WORKDIR /app

COPY package*.json ./
RUN npm install


# ----------------------------------------
# 2. Dev: Hot-reloading Local Environment
# ----------------------------------------
FROM base AS dev

ARG PORT_DEV
ENV PORT_DEV=${PORT_DEV}

COPY . .

EXPOSE ${PORT_DEV}

CMD ["npm", "run", "dev"]


# ----------------------------------------
# 3. Prod: Clean Production Runtime
# ----------------------------------------
FROM base AS prod

ARG PORT
ENV PORT=${PORT}
ENV NODE_ENV=production

# Copy source and build
COPY . .
RUN npm run build

# Prune devDependencies to keep image small
RUN npm prune --production

EXPOSE ${PORT}

CMD ["npm", "start"]
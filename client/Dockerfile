# Build context is the repo root (npm workspaces), so this Dockerfile is
# invoked as: docker build -f client/Dockerfile .

FROM node:22-bookworm-slim AS builder
WORKDIR /app

# Prisma needs libssl at install time; server's postinstall (`prisma
# generate`) also needs the schema present before `npm ci` runs, even
# though this image never runs the server — it's a single npm-workspaces
# install covering both packages.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
COPY server/prisma ./server/prisma
COPY server/prisma.config.ts ./server/prisma.config.ts
RUN npm ci

COPY client ./client
# Same-origin deployment behind the nginx reverse proxy below, so the
# default "/api" (see client/src/lib/apiClient.ts) needs no override here.
RUN npm run build --workspace client

FROM nginx:1.27-alpine AS runner
COPY --from=builder /app/client/dist /usr/share/nginx/html
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

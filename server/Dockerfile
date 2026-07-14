# Build context is the repo root (npm workspaces), so this Dockerfile is
# invoked as: docker build -f server/Dockerfile .

FROM node:22-bookworm-slim AS builder
WORKDIR /app

# argon2 compiles a native addon at install time; Prisma's query engine
# needs libssl to be present (and detectable) at both install and run time.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY client/package.json client/package.json
# server's postinstall runs `prisma generate`, which needs the schema
# present before `npm ci` below, not after.
COPY server/prisma ./server/prisma
COPY server/prisma.config.ts ./server/prisma.config.ts
RUN npm ci

COPY server ./server
RUN npm run build --workspace server

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/server/package.json ./server/package.json
COPY --from=builder /app/server/prisma.config.ts ./server/prisma.config.ts
COPY --from=builder /app/server/prisma ./server/prisma
COPY --from=builder /app/server/dist ./server/dist

EXPOSE 3001
WORKDIR /app/server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]

# BeniFits

BeniFits is a fullstack health, fitness, nutrition, and wellness platform built with a React frontend and an Express backend. The project currently covers the foundation, core health tools, AI-assisted coaching, and an expert marketplace workflow, with a roadmap for community, content, wellness, and production hardening still ahead.

## Overview

The application is organized as a modern TypeScript monorepo with separate client and server workspaces. It uses PostgreSQL for persistence, Prisma for data access, JWT-based authentication, and a mix of REST, Server-Sent Events, and Socket.IO for real-time experiences.

The current implementation focuses on:

- authenticated user accounts and health profiles
- progress tracking with charts
- nutrition search and calorie/macro calculations
- diet and workout planning
- AI nutrition chat and AI weight-loss coaching
- expert discovery, booking, and messaging

## Tech Stack

- Frontend: React, Vite, TypeScript, Tailwind CSS v4
- Client state and data: React Router v7, TanStack Query, React Hook Form, Zod
- Visualization: Recharts
- Backend: Node.js, Express, TypeScript
- Database: PostgreSQL
- ORM: Prisma 7 with the PostgreSQL driver adapter
- Auth: JWT access and refresh tokens, argon2 password hashing
- Realtime: Server-Sent Events and Socket.IO
- External AI: Anthropic Claude API via `@anthropic-ai/sdk`
- Testing: Vitest, Supertest, Testing Library

## Current Scope

### Completed phases

- Phase 1: Foundation
- Phase 2: Core Health
- Phase 3: AI Features, partial scope
- Phase 4: Expert Marketplace, partial scope

### Not started yet

- Phase 5: Community
- Phase 6: Content Platform
- Phase 7: Wellness
- Phase 8: Production Readiness

For the detailed roadmap and implementation notes, see [`plan.md`](/Users/nayburrahman/Downloads/BeniFits/plan.md).

## Features

### Foundation

- Email/password registration and login
- JWT auth with access and refresh token rotation
- Protected routes on the client
- User health profile creation and editing
- Server-computed BMI and related profile data
- PostgreSQL-backed persistence through Prisma

### Core Health

- Progress tracking with dated entries
- Weight trend charting
- USDA FoodData Central nutrition search
- Calorie and macro calculation tools
- Editable diet plan templates
- Rule-based workout plan generation

### AI Features

- AI nutritionist chat with streamed responses
- AI weight-loss coaching with structured weekly plans
- Safety-focused prompts and medical disclaimers
- Graceful failure when `ANTHROPIC_API_KEY` is not configured

### Expert Marketplace

- Expert profiles and role-based access
- Expert directory and detail pages
- Appointment booking with atomic slot claiming
- In-app messaging for booking-related conversations
- Demo expert accounts seeded for local development
- Socket.IO-powered realtime chat

## Repository Structure

- `client/` - React application
- `server/` - Express API and Prisma schema
- `docker-compose.yml` - local PostgreSQL service
- `plan.md` - project roadmap and implementation record

## Getting Started

### Prerequisites

- Node.js and npm
- Docker Desktop or another Docker-compatible environment

### 1. Install dependencies

From the repository root:

```bash
npm install
```

### 2. Start PostgreSQL

Bring up the local database with Docker Compose:

```bash
docker compose up -d
```

### 3. Configure environment variables

Create or update the environment files used by each workspace:

- `server/.env`
- `client/.env`

The provided examples show the expected shape:

- [`server/.env.example`](/Users/nayburrahman/Downloads/BeniFits/server/.env.example)
- [`client/.env.example`](/Users/nayburrahman/Downloads/BeniFits/client/.env.example)
- [`.env.example`](/Users/nayburrahman/Downloads/BeniFits/.env.example)

Typical values:

```env
# server/.env
PORT=3001
DATABASE_URL="postgresql://benifits:benifits@localhost:5432/benifits?schema=public"
JWT_ACCESS_SECRET="change-me-to-a-random-64-char-hex-string"
JWT_REFRESH_SECRET="change-me-to-a-different-random-64-char-hex-string"
USDA_FDC_API_KEY=
ANTHROPIC_API_KEY=
```

```env
# client/.env
VITE_API_BASE_URL=/api
```

### 4. Run database setup

If this is the first time the project is running locally, apply Prisma migrations and seed data from the server workspace as needed. The exact command set depends on which phase you want to work on, but the common workflow is:

```bash
npm run db:migrate --workspace server
npm run db:seed --workspace server
```

### 5. Start the app

Run the client and server in separate terminals:

```bash
npm run dev:server
npm run dev:client
```

The Vite app runs on port `5173` and proxies API requests to the Express server on port `3001`.

## Available Scripts

From the repository root:

- `npm run dev:client` - start the React app
- `npm run dev:server` - start the API server
- `npm run build:client` - build the React app for production
- `npm run start:server` - run the compiled API server
- `npm run lint` - lint the repository
- `npm run format` - format the repository with Prettier
- `npm run typecheck` - run TypeScript type checks in both workspaces
- `npm test` - run the client and server test suites

Workspace-specific scripts are also available inside `client/` and `server/`.

## Architecture Notes

- The client uses React Router for navigation and TanStack Query for API state.
- Authentication state is held on the client with protected route guards for private pages.
- The server exposes a centralized JSON error shape through shared error middleware.
- Prisma migrations live in `server/prisma/migrations/`.
- PostgreSQL is started locally with Docker Compose so no separate database install is required.
- External API access is isolated behind server-side helpers for USDA and Anthropic.
- Server tests use an isolated test database and mock external APIs to keep runs deterministic.

## Testing

The repository includes automated tests in both workspaces:

- client-side UI and interaction tests
- server-side route and service tests
- integration coverage for realtime messaging where the real Socket.IO server is exercised

Run everything with:

```bash
npm test
```

## Roadmap

The remaining roadmap items from `plan.md` are:

1. Add live Anthropic API credentials and verify the AI features end to end.
2. Complete the deferred expert marketplace work, including payments and video consultations.
3. Build the community features for posts, comments, follows, and challenges.
4. Add the content platform for recipes, news, research summaries, and videos.
5. Add the wellness tools for mood, sleep, meditation, and gamification.
6. Finish production readiness work such as notifications, monitoring, CI/CD, and security hardening.

## Contributing / Working Notes

- Keep changes aligned with the phase-by-phase plan in [`plan.md`](/Users/nayburrahman/Downloads/BeniFits/plan.md).
- Prefer end-to-end verification against the running app when adding new features.
- Update environment examples when new configuration is introduced.


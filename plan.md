# BeniFits — Project Plan

This document tracks the full roadmap for BeniFits and the detailed sub-plan
breakdown for every round of work completed so far. Each round maps to one
phase of the original blueprint; each round is broken into small sub-plans,
and every sub-plan ends in its own commit (see `git log` for exact diffs).

**Status as of this writing: Phases 1–7 complete (66 commits). Phase 8 not started.**

---

## Original Blueprint (high-level)

BeniFits is a comprehensive AI-powered fitness, health, nutrition, and
wellness platform. The full blueprint defines 8 phases:

| Phase | Scope | Status |
|---|---|---|
| 1 | Foundation — auth, user profiles, health profile, dashboard, database setup | ✅ Done |
| 2 | Core Health — diet planner, calorie calculator, workout planner, progress tracking | ✅ Done |
| 3 | AI Features — AI nutritionist, AI weight-loss coach, personalized recommendations | ✅ Done (partial — see scope note) |
| 4 | Expert Marketplace — expert profiles, booking, chat, payments, consultations | ✅ Done (partial — see scope note) |
| 5 | Community — social feed, stories, comments, follows, challenges | ✅ Done (partial — see scope note) |
| 6 | Content Platform — daily recipes, health news, research summaries, video recommendations | ✅ Done (full scope — see note) |
| 7 | Wellness — mood tracking, meditation, sleep tools, gamification | ✅ Done (full scope, including the Phase 5 challenges/leaderboard deferral) |
| 8 | Production Readiness — notifications, monitoring, CI/CD, testing, security hardening, scaling | ⬜ Not started |

**Tech stack chosen:** React + Vite + TypeScript + Tailwind CSS v4, React
Router v7, TanStack Query, React Hook Form + Zod, Recharts (frontend);
Node.js + Express + TypeScript, Prisma 7 (driver adapters) + PostgreSQL,
JWT auth, Docker Compose for local Postgres (backend); Anthropic Claude API
(`@anthropic-ai/sdk`, model `claude-opus-4-8`) for AI features; Vitest +
Supertest + Testing Library for tests across both workspaces.

**Working method:** each phase is scoped down from the full blueprint
description into a tight, realistic round (confirmed with the user up
front), then broken into small sub-plans — typically one backend sub-plan +
one frontend sub-plan per feature, plus a final sub-plan adding automated
tests. Every sub-plan is verified end-to-end (curl against the real stack,
not just unit tests) before being committed on its own.

---

## Phase 1 — Foundation ✅

**Goal:** auth + health profile, on a proper TypeScript/Postgres/Prisma
foundation, replacing the bare JS starter scaffold.

| # | Sub-plan | Commit |
|---|---|---|
| 1 | Migrate client and server to TypeScript + shared ESLint/Prettier config | `aee3785` |
| 2 | PostgreSQL + Prisma, `User` + `HealthProfile` models | `6184798` |
| 3 | Email/password auth with JWT (access + refresh, argon2, rate limiting) | `fe16a63` |
| 4 | Authenticated health profile API (server-computed BMI) | `93b0996` |
| 5 | Client app shell — routing, TanStack Query, Tailwind | `79f1d40` |
| 6 | Login/register UI + auth state (`AuthContext`, `ProtectedRoute`) | `0f7472e` |
| 7 | Health profile form UI | `3109d93` |
| 8 | Auth + profile automated tests | `e9ad881` |

**Key decisions / things found along the way:**
- Converted the bare JS starter to TypeScript, Prisma, PostgreSQL before any
  feature work, since almost no code existed yet.
- Docker Compose runs Postgres locally (no local `psql` install needed).
- Prisma 7's new driver-adapter client (`@prisma/adapter-pg`) required an
  explicit `PrismaPg` adapter — the old "just works from `DATABASE_URL`"
  pattern is gone.
- Root `.gitignore`'s `/dist` pattern was anchored to the repo root and
  silently missed `client/dist` / `server/dist` — fixed.
- A dependency-hygiene bug: `prisma`'s transitive `@prisma/studio-core` →
  Radix UI chain pulled in `@types/react@19`, conflicting with the client's
  pinned React 18 types wherever a package's own type declarations resolved
  from the hoisted root `node_modules`. Fixed with a root `overrides` entry.
- Refresh token lives in an httpOnly cookie scoped to `/api/auth`, rotated
  on every refresh; access token lives in memory on the client only.

---

## Phase 2 — Core Health ✅

**Goal:** the four "Core Health" features from the blueprint — all
deterministic/rule-based (no AI yet, that's Phase 3).

| # | Sub-plan | Commit |
|---|---|---|
| 1 | Progress tracking API (`ProgressEntry`, upsert-by-date, BMI from profile) | `07dd068` |
| 2 | Progress tracking UI (log form + Recharts weight chart) | `3832495` |
| 3 | USDA FoodData Central nutrition search API (server-side proxy) | `331bfd3` |
| 4 | Nutrition calculator UI (search + macros) | `ebfc179` |
| 5 | Diet planner API (`DietPlan` + `DietPlanMeal`, computed totals) | `a8c5966` |
| 6 | Diet planner UI (meal builder, pulls macros from nutrition search) | `96afa85` |
| 7 | Workout planner API — 36-exercise seed library + rule-based weekly generator | `52a9375` |
| 8 | Workout planner UI (generate + weekly grid view) | `be23d0c` |
| 9 | Tests for all four Phase 2 features | `5b32b4e` |

**Scope simplifications vs. the literal blueprint wording:**
- Diet plan = one editable "day template" (title + macro targets + a list
  of breakfast/lunch/dinner/snack entries), not a multi-day calendar.
  Shopping-list generation is out of scope.
- Workout plan = one generated weekly template (7 days, some rest days),
  not an expanding N-week calendar of dated sessions.

**Key decisions / things found along the way:**
- USDA's API gateway silently 400s when the `"Survey (FNDDS)"` dataset
  name's parentheses are percent-encoded — which is exactly how
  `URLSearchParams` always encodes them. Confirmed via isolated curl-vs-
  fetch comparison; worked around by dropping that one dataset from the
  filter rather than hand-rolling non-standard query encoding.
- An Express + TypeScript overload gap: chaining `validateBody` before a
  route handler loses the literal `:id` param type inference (falls back to
  `string | string[]`) in a way that a single-handler route doesn't hit.
  Caught by the type checker, narrowed explicitly.
- A flaky-test bug: `lib/prisma.ts` read `process.env.DATABASE_URL` at
  module-import time, racing against a `setupFiles`-based dotenv call.
  Fixed via Vitest's `test.env` (populated once in `vitest.config.ts`,
  guaranteed to apply before any test module loads).
- The workout generator is deterministic, not AI: `activityLevel` maps to a
  difficulty tier, `goal` maps to a 7-day category rotation with built-in
  rest days.

---

## Phase 3 — AI Features ✅ (partial scope)

**Goal:** the two concrete features named in the blueprint's Phase 3 — an
AI nutritionist chat and an AI weight-loss coach. General "personalized
recommendations" and the rest of the AI roadmap (grocery lists, symptom
guidance, recipe generation, research summarization) were scoped out for a
later round.

| # | Sub-plan | Commit |
|---|---|---|
| 1 | AI nutritionist chat API (streaming, `AiConversation` + `AiChatMessage`) | `ea0535f` |
| 2 | AI nutritionist chat UI (SSE-streamed chat page) | `96ffa42` |
| 3 | AI weight-loss coach API (structured week-by-week plans) | `b8b2c5c` |
| 4 | AI weight-loss coach UI (form + weekly plan cards) | `a3226af` |
| 5 | Tests for both AI features (Anthropic SDK mocked) | `d26100d` |

**Model/SDK choice:** official `@anthropic-ai/sdk` for Node/TypeScript,
model `claude-opus-4-8`, called server-side only — the API key never
reaches the browser.

**Key decisions / things found along the way:**
- **No `ANTHROPIC_API_KEY` is configured yet.** Per instruction, the code
  reads it from env with no code changes needed once a real key is added;
  until then `getClaudeClient()` throws a clean `AppError(503)` *before*
  any DB writes happen, so a request made without a key fails fast with no
  orphaned messages/plans and no hang. This was verified via curl and is
  covered by the test suite, but **live generation quality has not been
  verified** — that needs a real key (see "Next steps" below).
- One ongoing `AiConversation` per user (not a multi-thread chat), to keep
  both backend and frontend simple for this round.
- Chat streams via raw SSE (`client.messages.stream()` on the server,
  hand-rolled `fetch` + `ReadableStream` frame parser on the client — no
  extra client dependency needed).
- Weight-loss plans use the SDK's structured-outputs helper
  (`zodOutputFormat` + `messages.parse()`), with **one Zod schema shared**
  between request validation and the model's expected output shape.
- Both system prompts hard-code a no-diagnosis/no-prescription safety
  instruction, and both UI pages show a visible "not medical advice"
  disclaimer banner.
- LLM-calling endpoints are rate-limited separately from cheap DB-only
  endpoints, since LLM calls cost real money.
- Found and fixed a React lint rule violation (`react-hooks/set-state-in-
  effect`) in the chat page by deriving the message list instead of
  syncing it via `useEffect` — this also happened to eliminate a UI
  flicker on send.
- Found and fixed a real jsdom gap (`scrollIntoView` not implemented) with
  a minimal polyfill in the shared client test setup.

---

## Phase 4 — Expert Marketplace ✅ (partial scope)

**Goal:** the core marketplace loop — browse experts, book a slot, message
about the booking. Payments and live video consultations were scoped out
for a later round (per the user's confirmation up front); the blueprint's
"payment provider" and "video call provider" open questions are deferred
rather than answered.

| # | Sub-plan | Commit |
|---|---|---|
| 1 | Expert profiles, role-gating middleware, directory API + demo seed data | `ff80470` |
| 2 | Availability slots + appointment booking API (atomic double-booking guard) | `4f50644` |
| 3 | Expert directory, detail, and dashboard UI + first UI primitives | `2fe3b6c` |
| 4 | Booking flow UI (slot picker modal, My Appointments) | `0dd2ff8` |
| 5 | Socket.IO messaging backend + Conversation/Message models + REST history | `d7ae175` |
| 6 | socket.io-client integration + messaging UI | `9801229` |
| 7 | Backend tests (expert directory, booking, messaging) | `f310314` |
| 8 | Frontend tests (expert pages, appointments, conversation) | `594a127` |

**Scope simplifications vs. the literal blueprint wording:**
- No payments: bookings use an `AppointmentStatus` enum
  (`PENDING`/`CONFIRMED`/`CANCELLED`/`COMPLETED`) with no real payment
  processing. The model is structured so a payment step can be added later
  without reworking booking.
- No live video: consultations happen over the in-app chat, not a video
  call. No video provider is integrated.
- No admin panel / self-serve expert onboarding: registration always sets
  `role=USER`. Demo expert accounts (5, across `NUTRITIONIST`/`DOCTOR`/
  `COACH`) are provisioned by an extended `server/prisma/seed.ts`, upserted
  by email so reruns are safe.
- Availability is ad-hoc: experts manually create individual open
  `AvailabilitySlot` rows, not recurring weekly rules.
- Chat is scoped one `Conversation` thread per `Appointment` (mirrors the
  existing `AiConversation` 1:1 pattern), open for messaging from `PENDING`
  onward and blocked only once `CANCELLED`.

**Key decisions / things found along the way:**
- The `Role` enum already had `NUTRITIONIST`/`DOCTOR`/`COACH`/`ADMIN`
  values from Phase 1's schema — no role migration was needed, just a new
  `requireRole(...)` middleware (the first role-gating middleware in the
  codebase; everything before this only checked `authenticate` +
  ownership).
- Booking uses a `$transaction` with a conditional `updateMany` guard
  (`where: { status: 'OPEN' }`) to atomically claim a slot — verified via a
  deliberate concurrent double-booking attempt (one request gets 201, the
  other 409).
- Found and fixed a real bug during Phase 4 itself: `Appointment.slotId`
  was originally `@unique`, so cancelling a booking reopened the slot but
  left the old cancelled `Appointment` row holding the unique constraint,
  permanently blocking that slot from ever being rebooked. Fixed by making
  the slot-to-appointment relation one-to-many (a slot can have many
  appointments over its lifetime; the atomic `OPEN`→`BOOKED` transition
  already guarantees only one is ever active).
- Found and fixed a related concurrency bug: two participants joining a
  brand-new conversation at the same moment could both attempt
  `conversation.upsert`, and Prisma's upsert isn't atomic against a true
  race here — one side got a unique-constraint error instead of joining.
  Fixed with a `getOrCreateConversation` helper that falls back to a plain
  fetch on a `P2002` conflict.
- Messaging uses Socket.IO (`socket.io` + `socket.io-client`) — a new kind
  of dependency for this codebase, since every prior feature used REST or
  one-way SSE (the AI chat's streaming technique). JWT auth happens on the
  socket handshake, reusing the same `verifyAccessToken` as REST. Messages
  persist to Postgres so history survives reconnects; a REST
  `GET /api/conversations/:appointmentId/messages` loads history on page
  mount before the socket joins the room.
- The Vite dev proxy needed a second entry for `/socket.io` with `ws: true`
  — the existing `/api` proxy doesn't cover Socket.IO's default path or
  the WebSocket upgrade.
- Introduced the first shared UI primitives (`client/src/components/ui`:
  `Button`, `Card`, `Badge`, `Modal`) since the expert directory's card
  grid and the booking confirmation dialog were the first UI complex
  enough to warrant it — thin wrappers around the Tailwind classes already
  hand-copied across every earlier page, not a new design system.
- Tightened `AuthUser['role']` from `string` to a proper `Role` union now
  that role-based UI gating (nav links, the expert dashboard, appointment
  view toggle) is load-bearing for the first time.
- Frontend tests for the new role-gated pages (`ExpertDashboardPage`,
  `AppointmentsPage`) mock `useAuth` directly, since the shared
  `renderWithProviders` test harness's `AuthProvider` always resolves to a
  logged-out user (its `/auth/refresh` call is mocked to reject).
- The messaging test spins up a real `http.Server` wrapping the Express
  app plus `attachSocket`, and connects with real `socket.io-client`
  instances — no mocking, consistent with how every other server test
  hits a real Postgres test database instead of stubbing internals.

---

## Phase 5 — Community ✅ (partial scope)

**Goal:** the core social loop — post, like, comment, follow, and a
lightweight public profile to land on. Ephemeral 24h "stories" and
challenges/leaderboard were scoped out for a later round (challenges
overlaps with Phase 7's Wellness gamification anyway).

| # | Sub-plan | Commit |
|---|---|---|
| 1 | `Post` model + core posts API (create, paginated feed, owner delete) | `5d9ff05` |
| 2 | `PostLike` + `Comment` models, nested like/comment API | `2666679` |
| 3 | `Follow` model + users API (public profile, follow/unfollow) | `e5bc861` |
| 4 | Community feed UI (composer, Discover/Following tabs, like button) | `321291d` |
| 5 | Inline comment threads on the feed | `c961cf6` |
| 6 | Public user profile page (`/users/:id`) | `f301988` |
| 7 | Backend tests (posts, likes, comments, follows) | `faeb988` |
| 8 | Frontend tests (feed, profile) | `0d3ed4b` |

**Scope simplifications vs. the literal blueprint wording:**
- No stories: no ephemeral 24h media posts, a distinct UI paradigm from
  the rest of this round.
- No challenges/leaderboard: gamification is deferred to Phase 7.
- Text-only posts: no images. No file-upload infrastructure exists in
  this codebase (no multer, no cloud storage SDK; `User.avatar` remains
  an unused string column), so this avoids introducing a new infra
  category for a feature that could reasonably go several ways.
- Public profile shows follower/following **counts** only, no list
  pages — nothing else would consume a followers/following list this
  round, so it wasn't built.

**Key decisions / things found along the way:**
- One endpoint (`GET /api/posts`) does triple duty — global feed
  (`scope=discover`), following-only feed (`scope=following`), and a
  single author's posts (`authorId=`, reused by the profile page) —
  instead of three separate endpoints, since the shape and pagination
  logic is identical across all three.
- Pagination is plain `take`/`skip` with a `take+1`/slice `hasMore`
  trick (no extra COUNT query), not cursor-based — matches the
  codebase's existing bias toward simplicity (the expert directory has
  no pagination at all).
- The "Following" feed excludes the viewer's own posts and uses a
  nested relation filter (`author.followers.some(followerId: viewer)`)
  rather than fetching follow IDs separately.
- Like/unlike are separate `POST`/`DELETE` endpoints (not a toggle),
  matching the explicit-state-transition style already established by
  appointment status changes — 409 on double-like, 404 on unliking
  something not liked.
- The like button uses plain `invalidateQueries` like every other
  mutation in this codebase, not an optimistic update — confirmed with
  the user rather than assumed, to keep the mutation pattern consistent
  rather than introduce the first exception.
- `PostCard` (feed post rendering, including the like button and
  comment thread) is defined once in `FeedPage.tsx` and exported for
  reuse on `UserProfilePage.tsx`, instead of duplicating post-rendering
  markup across two pages.
- Found and fixed a real test-infrastructure bug while writing this
  phase's frontend tests: `client/vitest.config.ts` doesn't enable
  `test.globals`, so Testing Library's automatic `afterEach(cleanup)`
  never registered — multi-test files were silently leaking rendered
  DOM between tests within the same file (a leftover button from test 1
  was still present when test 2 ran). Fixed by wiring `cleanup()`
  explicitly in `client/tests/setup.ts`, which also retroactively
  hardens every existing multi-test file from Phase 4.

---

## Phase 6 — Content Platform ✅ (full scope)

**Goal:** all four content types named in the blueprint — recipes, health
news, research summaries, video recommendations. Unlike every prior phase,
this round covered full breadth rather than scoping down (confirmed
explicitly with the user after flagging it as ~4x the external-API
surface of any previous round). Each is a lazy-key external-API
integration following the exact pattern `server/src/lib/usda.ts`
established in Phase 2.

| # | Sub-plan | Commit |
|---|---|---|
| 1 | Spoonacular recipe search/detail client | `c069808` |
| 2 | Recipes API | `2d00efa` |
| 3 | Recipes browse page | `ae0e65c` |
| 4 | Recipe detail page + diet-plan integration | `dde1990` |
| 5 | NewsAPI health news client | `fccb22f` |
| 6 | Health news API | `6db7d8b` |
| 7 | Health news page | `7a0ddb2` |
| 8 | PubMed research summaries client | `9c3cb06` |
| 9 | Research summaries API | `1cc6e9b` |
| 10 | Research summaries page | `4e30467` |
| 11 | YouTube video search client | `3f74d52` |
| 12 | Video search API | `903b3a3` |
| 13 | Video search page | `0332ec2` |
| 14 | Backend tests (all four content APIs) | `76aa248` |
| 15 | Frontend tests (all five new pages) | `41320b4` |

**Scope, as confirmed with the user up front:**
- **Recipes** — Spoonacular API, open-ended search/browse (not a single
  "recipe of the day"). Integrates with the existing diet planner: a
  recipe detail page can add itself as a `DietPlanMeal` to an existing or
  new diet plan.
- **Health news** — NewsAPI.org. A default feed (`top-headlines?
  category=health`) plus keyword search (`everything?q=...
  &sortBy=publishedAt`) once the user types something — no "digest"
  framing.
- **Research summaries** — PubMed's free E-utilities API, raw abstracts
  only, **no AI/Claude involvement** (deliberately not reusing
  `server/src/lib/claude.ts`, per the user's explicit choice).
- **Video recommendations** — YouTube Data API v3 keyword search/browse,
  not ML-personalized recommendations (that would need a new data model
  and OAuth scope).

**Key decisions / things found along the way:**
- No new backend endpoint for the diet-plan integration: the client
  fetches the target plan (already returns its meals embedded via
  `include: { meals: true }`), appends the new meal, and `PUT`s the whole
  plan back through the existing full-replace `dietPlanSchema` route from
  Phase 2 — confirmed with the user as the preferred approach over adding
  a new `POST /:id/meals` endpoint.
- `fast-xml-parser` is the only new npm dependency this round — PubMed's
  abstract text is only reliably available via XML (`esummary`'s JSON
  mode has no abstract field), and every other client reuses existing
  dependencies exactly.
- **Found and fixed a real bug** while live-verifying the PubMed client:
  `fast-xml-parser` coerces numeric-looking text content (`PMID`, `Year`)
  into JS numbers by default, silently violating the string-typed
  `ResearchSummary` contract. Fixed with explicit `String()` coercion at
  every extraction path — caught specifically because this phase's
  verification discipline included a real live API call, not just the
  graceful-503 path the other three clients get.
- PubMed is the one client whose `getApiKey()` doesn't throw — an
  optional `PUBMED_API_KEY` only raises NCBI's rate limit (10 req/s vs
  3 req/s), so the feature works fully keyless. Every request carries a
  fixed `tool=benifits-app` identifier per NCBI's usage guidelines —
  deliberately never a real user's email address.
- Since none of the four API keys are configured yet, verification for
  Spoonacular/NewsAPI/YouTube followed the same discipline Phase 3 used
  before a real `ANTHROPIC_API_KEY` existed: confirm the graceful
  `AppError(503, ...)` path end-to-end via curl. PubMed needed no such
  workaround — its route and page sub-plans were verified against the
  real live API, the only fully-live-verified feature in this round.
- Video search gets the tightest per-user rate limit of the four
  (`limit: 15` per 15 min) since YouTube's default quota is the most
  restrictive of the three paid APIs (100 quota units per search against
  a 10,000/day default budget).

---

## Phase 7 — Wellness ✅ (full scope, including the Phase 5 deferral)

**Goal:** all four Wellness features named in the blueprint — mood
tracking, sleep tools, meditation, and gamification — plus the
challenges/leaderboard feature deferred from Phase 5's Community round,
since the user chose to fold it in here rather than ship it standalone.
Scope was confirmed with the user up front via three targeted questions
(gamification breadth, sleep tools vs. the existing `sleepHours` field,
and how meditation would work with no audio infra in this codebase).

| # | Sub-plan | Commit |
|---|---|---|
| 1 | Mood tracking API (`MoodEntry`, upsert-by-date) | `1bb4723` |
| 2 | Mood tracking UI (emoji picker + Recharts line chart) | `622f643` |
| 3 | Sleep tools API (`SleepEntry` + `sleepGoalHours` on `HealthProfile`) | `72db901` |
| 4 | Sleep tools UI (bedtime/wake form + duration bar chart with goal line) | `eee95d3` |
| 5 | Meditation API (18-session seeded library + `MeditationLog`) | `23001cf` |
| 6 | Meditation UI (category browser + countdown timer modal) | `d967756` |
| 7 | Gamification core API (streaks + badges) | `ad501dc` |
| 8 | Gamification UI (wellness dashboard) | `ed22c93` |
| 9 | Challenges + leaderboard API | `bbd876b` |
| 10 | Challenges + leaderboard UI | `b032784` |
| 11 | Backend tests (all five Phase 7 APIs) | `5a5a471` |
| 12 | Frontend tests (all six new pages) | `503caeb` |

**Scope, as confirmed with the user up front:**
- **Gamification** covers the full breadth named across Phases 5 and 7:
  streaks, badges, *and* challenges/leaderboard — the user explicitly chose
  to close out the Phase 5 deferral here rather than leave it standalone.
- **Sleep tools** got a dedicated `SleepEntry` model (bedtime, wake time,
  server-computed duration, 1-5 quality rating) plus a `sleepGoalHours`
  field on `HealthProfile`, rather than building on top of the existing
  `ProgressEntry.sleepHours` / `HealthProfile.sleepHours` fields, which
  only ever captured a single "typical hours" number.
- **Meditation** is a guided session library (18 seeded sessions across 6
  categories: breathing, body scan, sleep, focus, stress relief,
  mindfulness) with a client-side countdown timer — no audio/video files,
  since no file storage or CDN infra exists anywhere in this codebase.

**Key decisions / things found along the way:**
- Mood, sleep, and meditation all follow the exact `ProgressEntry`
  upsert-by-date pattern from Phase 2 — except meditation, which
  deliberately allows multiple log entries per day (no unique constraint),
  since meditating more than once a day is normal in a way that logging
  two different weights for the same day isn't.
- **Gamification stays purely computed, no cron or stored aggregates** —
  consistent with how BMI and the workout generator already worked in this
  codebase. `lib/gamification.ts` computes the current streak (consecutive
  days with any mood/sleep/meditation activity, not broken by a not-yet-
  logged "today" until yesterday is also missed — the common
  Duolingo-style streak convention) and evaluates a fixed in-code catalog
  of 10 badge definitions against live counts every time a wellness entry
  is logged, awarding any newly met one via `checkAndAwardBadges()`.
- The `UserBadge` unique constraint (`userId` + `badgeKey`) is guarded the
  same way Phase 4's `getOrCreateConversation` guards its own race: a
  `PrismaClientKnownRequestError` `P2002` catch, not a pre-check alone —
  necessary because the "already earned?" check and the award itself
  aren't atomic against a genuine concurrent double-request.
- Challenges reuse the same demo-seed-data pattern as Phase 4's expert
  accounts (`server/prisma/seed.ts`) since this codebase still has no
  admin panel or self-serve content creation for anything. Four demo
  challenges are seeded, one per `ChallengeMetric`
  (`MEDITATION_MINUTES`/`MOOD_LOGS`/`SLEEP_LOGS`/`ACTIVE_DAYS`), with
  rolling start/end dates computed at seed time so they stay "currently
  running" whenever the seed is first run.
- Leaderboard progress is computed live per participant
  (`computeChallengeProgress()`, reusing the same per-feature count/
  aggregate queries the badges use) over `[challenge.startsAt, min(now,
  challenge.endsAt)]` — no stored/cached progress counters to keep in
  sync.
- The sleep goal is edited on the existing Profile page (Phase 1), not
  duplicated as a separate settings flow on the new Sleep page — the same
  reasoning as Phase 6's diet-plan integration reusing an existing
  full-replace endpoint instead of adding a parallel one.
- Regenerating the Prisma client (`npx prisma generate`) after every
  schema change was required *in addition to* `prisma migrate dev` in this
  session — the migration applied cleanly each time but the generated
  client under `server/src/generated/prisma` (gitignored, custom output
  path) didn't pick up the new models until `generate` was run explicitly,
  causing a `Cannot read properties of undefined (reading 'upsert')`
  runtime error on the very first mood-tracking curl check. Every
  subsequent schema sub-plan ran `generate` immediately after `migrate
  dev` to avoid repeating this.
- All 12 sub-plans were verified end-to-end via curl against the real
  running stack (registering test users, exercising upsert/validation/
  ownership-scoping/404 paths) before being committed, plus a client
  production build (`vite build`) and a `tsc --noEmit` pass after every
  frontend sub-plan — the same discipline as every prior phase.

---

## Cross-cutting infrastructure notes (apply to all phases)

- **Database:** PostgreSQL via Docker Compose (`docker compose up -d`),
  Prisma migrations in `server/prisma/migrations/`. Test suite runs against
  an isolated `benifits_test` database (auto-created and migrated by a
  Vitest `globalSetup`), never the dev database.
- **Auth:** every new authenticated route reuses `middleware/auth.ts`
  (`authenticate`) and scopes list/detail/delete operations to
  `req.userId`, returning 404 (not 403) on other users' resources to avoid
  leaking existence.
- **Validation:** `middleware/validate.ts` + per-feature Zod schemas in
  `server/src/schemas/`.
- **Errors:** `errors/AppError.ts` + `middleware/errorHandler.ts` — a
  single centralized JSON error shape across the whole API.
- **External API keys:** USDA (`USDA_FDC_API_KEY`) and Anthropic
  (`ANTHROPIC_API_KEY`) both live in `server/.env` (gitignored, never
  committed) and are read lazily with a clean `AppError(503)` if unset,
  rather than crashing the server or failing opaquely.
- **Testing:** every feature round ends in its own test sub-plan. Server
  tests mock external APIs (USDA, Anthropic, and Phase 6's four content
  clients) via `vi.mock` so the suite never depends on live network access
  or real credentials; Phase 4's messaging tests, all of Phase 5's tests,
  and all of Phase 7's tests are exceptions that hit a real Postgres test
  DB with no mocking, since nothing external is being called. `npm test`
  from the repo root runs both workspaces; currently 142 tests total (113
  server + 29 client), all green and confirmed stable across repeated
  runs. `client/tests/
  setup.ts` explicitly wires `afterEach(cleanup)` from Testing Library
  (Phase 5 found `test.globals` isn't enabled, so the automatic version
  never registered) — any new multi-test file benefits from this without
  extra setup.
- **Verification discipline:** every sub-plan is exercised end-to-end via
  curl (or the Vite dev proxy) against the real running stack before being
  committed — not just "tests pass," but the actual HTTP behavior observed.

---

## Next steps

1. **Add a real `ANTHROPIC_API_KEY`** to `server/.env` and spot-check the
   two AI features live: send a chat message and confirm a grounded,
   appropriately-disclaimed streamed reply; generate a weight-loss plan and
   confirm the week-by-week numbers are sane for a given profile.
2. **Expert Marketplace follow-up (deferred from Phase 4):** real payment
   processing (Stripe vs. SSLCommerz per the blueprint) and a video call
   provider for consultations, plus self-serve expert onboarding (currently
   demo accounts only, provisioned via the seed script).
3. **Community follow-up (deferred from Phase 5):** ephemeral 24h stories
   are still not built — challenges/leaderboard, the other Phase 5
   deferral, shipped as part of Phase 7 instead of standalone.
4. **Add real API keys** for Phase 6's four content integrations
   (`SPOONACULAR_API_KEY`, `NEWS_API_KEY`, `YOUTUBE_API_KEY`, and
   optionally `PUBMED_API_KEY` for a higher rate limit) to `server/.env`
   and spot-check live response shapes — everything was verified against
   the graceful-503 path for the three key-gated clients, plus one real
   live PubMed call, but full response-shape verification for Spoonacular/
   NewsAPI/YouTube needs real keys.
5. **Phase 7 follow-up:** no real follow-up items were deferred — the
   round shipped its full confirmed scope, including the Phase 5
   challenges/leaderboard deferral. The one open item is cosmetic: the
   meditation timer only logs a session's full nominal duration, never a
   partial one, even if the user hits "Complete now" early.
6. **Phase 8 — Production Readiness:** notifications (push/email/SMS),
   monitoring (Sentry/Prometheus), CI/CD, security hardening, deployment.
   Should happen before any real users touch the app in production.

Each of these, when started, will get the same treatment as Phases 1–7:
scope confirmed with the user, broken into small sub-plans, each sub-plan
verified end-to-end and committed on its own — and this file updated to
reflect the new state.

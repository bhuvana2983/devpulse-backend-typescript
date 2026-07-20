# DevPulse Backend (TypeScript)

A developer activity tracking backend that pulls GitHub commit streaks, language stats, and repo activity via the GitHub REST API, caches it in Redis, snapshots it nightly to MongoDB, and emails daily digests to users.

This is the TypeScript retrofit of the original [DevPulse backend](https://github.com/bhuvana2983/devpulse-backend) — same features, same deploy target (Docker/Render), rebuilt with real TypeScript usage: typed Mongoose models, typed GitHub API responses, a generic Redis cache wrapper, and Express request typing.

## Features

- GitHub OAuth login, with commit streaks and top-language stats pulled from the GitHub REST API
- Redis caching (1-hour TTL) in front of GitHub API calls — cached reads in <1ms vs. ~300ms live calls, keeping the app well under GitHub's rate limits
- Nightly cron job that snapshots each user's activity into MongoDB with upsert-based deduplication
- Daily email digests via Nodemailer
- Public, shareable developer profile endpoints (no auth required)
- Dockerized, deployed on Render

## Tech stack

Node.js · Express · TypeScript · MongoDB (Mongoose) · Redis · GitHub REST API · Docker

## TypeScript in this codebase

This isn't a find-and-replace `.js` → `.ts` conversion. Specific things worth pointing to:

- **Generics** — `CacheService` (`src/services/cacheService.ts`) exposes `get<T>()`, `set<T>()`, and `getOrSet<T>()`. Redis only stores strings, so every cached value round-trips through `JSON.parse`/`JSON.stringify`; generics let one cache implementation stay type-safe across the several different shapes it stores (GitHub profiles, repo lists, push events) instead of falling back to `any`.
- **Interfaces on both sides of an API boundary** — `types/github.ts` types GitHub's raw REST responses (`GitHubApiUser`, `GitHubApiRepo`, ...) separately from the normalized camelCase shapes the app actually uses internally (`GitHubProfile`, `GitHubRepo`), making that translation layer explicit and checked by the compiler.
- **Type narrowing** — `req.user` is typed as optional on Express's `Request` (`types/express.d.ts`), since auth middleware guaranteeing it's set is a runtime fact, not a compile-time one. Protected controllers narrow it with an explicit guard rather than an unsafe non-null assertion.
- **Type guards** — `isPushEvent()` narrows GitHub's mixed event feed down to just push events before streak calculation.
- **Enums** — `CacheTTL` names the different cache lifetimes (profile/repo data vs. more volatile event data) instead of leaving unlabeled magic numbers scattered across the service.

More detail, including the reasoning behind specific typing decisions, is in [`MIGRATION_NOTES.md`](./MIGRATION_NOTES.md).

## Project structure

```
src/
  config/        # MongoDB connection
  controllers/   # Route handlers
  middleware/    # JWT auth middleware
  models/        # Mongoose schemas (typed)
  routes/        # Express routers
  services/      # GitHub API client, Redis cache, cron jobs, email
  types/         # Shared interfaces, Express augmentation, error classes
```

## Getting started

```bash
npm install
cp .env.example .env   # fill in your own values
npm run dev             # local dev with hot reload
```

### Environment variables

```
MONGO_URI=
REDIS_URL=
JWT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
EMAIL_USER=
EMAIL_PASS=
FRONTEND_URL=
PORT=5000
```

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Run with hot reload (`ts-node-dev`) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled build (`node dist/server.js`) |
| `npm run typecheck` | Type-check without emitting output |

## Deployment

Build and run through Docker (multi-stage: compiles TypeScript in a build stage, ships only the compiled output + production dependencies in the runtime image):

```bash
docker-compose up --build
```

Deployed on Render using the same Dockerfile.

## API overview

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/auth/github` | — | Start GitHub OAuth flow |
| GET | `/api/auth/github/callback` | — | OAuth callback, issues JWT |
| GET | `/api/auth/me` | JWT | Current user |
| GET | `/api/github/stats` | JWT | Live GitHub stats (cached) |
| GET | `/api/dashboard/history` | JWT | Last 30 days of activity snapshots |
| GET | `/api/dashboard/public/:slug` | — | Public developer profile |
| GET | `/health` | — | Health check |

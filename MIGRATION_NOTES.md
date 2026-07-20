# TypeScript Migration Notes

Quick reference for talking through this migration in an interview — what changed, and why each decision was made rather than an alternative.

## Structure

- Source moved from repo root into `src/`, compiled to `dist/` via `tsc`.
- `npm run dev` uses `ts-node-dev` (fast incremental recompiles, no separate watch+build step).
- `npm run build` + `npm start` (`node dist/server.js`) is the production path — same as before, just with a compile step first.
- Docker now does the compile **inside the image** in a build stage, then a slim runtime stage copies only `dist/` + production `node_modules`. Two stages instead of one keeps the final image free of `typescript`, `ts-node-dev`, and `src/` — smaller image, and `tsc`'s output is what actually runs, so the container behavior matches CI.

## Where each TypeScript feature earns its place

- **Interfaces, not just inline types** — `IUser` / `IActivitySnapshot` (Mongoose documents) and `GitHubApiUser` / `GitHubApiRepo` / `GitHubApiEvent` (raw GitHub REST shapes) vs. `GitHubProfile` / `GitHubRepo` (our normalized camelCase shapes). The app was already doing a snake_case → camelCase translation by hand in `githubService.js`; typing both sides of that translation turns an implicit assumption into something the compiler checks.

- **Generics** — `CacheService.get<T>()` / `set<T>()` / `getOrSet<T>()` in `services/cacheService.ts`. Redis only stores strings; everything goes through `JSON.stringify`/`JSON.parse`, and `JSON.parse` returns `any`. Generics let one Redis wrapper stay type-safe for three completely different cached shapes (`GitHubProfile`, `GitHubRepo[]`, `PushEvent[]`) instead of either duplicating the class per shape or losing type safety with `any`. `getOrSet<T>()` also collapses the "check cache → fetch → populate cache" pattern that was copy-pasted three times in the original `githubService.js` into one implementation.

- **Type narrowing** — `req.user` is typed `IUser | undefined` on the augmented `Request` (see `types/express.d.ts`), deliberately *not* required. Express can't know at compile time that `protect` middleware ran before a given handler — that's a runtime guarantee, not a static one. Every protected controller does `if (!req.user) { ...; return; }` before using it, which is what actually narrows the type for the rest of the function. The alternative (a non-null assertion `req.user!`) would compile but silently produce `undefined`-related bugs if a route ever forgot to apply `protect`.

- **Type guards** — `isPushEvent()` in `types/github.ts` narrows `GitHubApiEvent[]` to `PushEvent[]` when filtering GitHub's `/events` response, so `calculateStreak` doesn't need a cast.

- **Enums** — `CacheTTL` in `githubService.ts` replaces three unlabeled magic numbers (`3600`, `3600`, `1800`) with named values, and documents that push events are cached for half as long as profile/repo data because they change more often.

- **Classes** — `CacheService` wraps the Redis client and its own error handling behind a small typed API. `AppError` / `NotFoundError` / `OAuthError` in `types/errors.ts` are a minimal error hierarchy — not used to rewrite every `try/catch` in the app (that's a separate, bigger refactor), just added where a named error type reads more clearly than an inline `res.status(...)`.

## Bug caught during the migration

`noUnusedLocals` flagged that `emailService.js`'s `sendDailyDigest` destructured `commits` from `stats` but never rendered it in the email HTML — the daily digest was silently omitting commit counts. Fixed by adding a row to the email table. This is a good talking point: strict mode isn't just style enforcement, it surfaced a real (if minor) product bug that plain JS never would have flagged.

## What was deliberately left alone

- No change to the actual runtime behavior/business logic — this is a typing retrofit, not a rewrite.
- `bcryptjs` dependency is unused in the codebase (it was unused before this migration too) — left as-is since removing it is outside the scope of a TS retrofit.
- Didn't introduce a DI container, class-based controllers, or a validation library (e.g. zod) — those are reasonable follow-ups but would be scope creep for "add real TypeScript usage."

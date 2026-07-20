// src/types/github.ts
//
// Two families of types live here on purpose:
//
// 1. `GitHubApi*` — the RAW shape GitHub's REST API actually returns
//    (snake_case, includes fields we don't use). These exist so that
//    when we read `response.data`, TypeScript knows what fields are
//    legal to reach for instead of us guessing/typo-ing a field name.
//
// 2. The normalized types (`GitHubProfile`, `GitHubRepo`, ...) — the
//    camelCase shape our app maps API responses into before caching
//    or returning them. This mapping already existed in githubService.js;
//    typing both sides makes the "translation layer" explicit instead
//    of implicit.

export interface GitHubApiUser {
  login: string;
  id: number;
  avatar_url: string;
  public_repos: number;
  followers: number;
  following: number;
  bio: string | null;
  created_at: string;
  email: string | null;
}

export interface GitHubApiRepo {
  name: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  private: boolean;
}

export interface GitHubApiEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

// GitHub's /users/:username/events endpoint returns many event types
// (PushEvent, WatchEvent, IssuesEvent, ForkEvent, ...). The raw event's
// `type` field is a plain string here (GitHub can add new event types
// at any time, so a closed literal union would be too strict). What we
// DO narrow with a literal type is the `PushEvent` interface below,
// combined with a type guard — that's the part of the codebase that
// actually branches on the value.
export interface GitHubApiEvent {
  id: string;
  type: string;
  created_at: string;
}

export interface PushEvent extends GitHubApiEvent {
  type: 'PushEvent';
}

/** Type guard: narrows GitHubApiEvent[] down to PushEvent[] at compile time. */
export function isPushEvent(event: GitHubApiEvent): event is PushEvent {
  return event.type === 'PushEvent';
}

// ---- Normalized shapes used internally + cached in Redis ----

export interface GitHubProfile {
  login: string;
  avatarUrl: string;
  publicRepos: number;
  followers: number;
  following: number;
  bio: string | null;
  createdAt: string;
}

export interface GitHubRepo {
  name: string;
  language: string | null;
  stargazersCount: number;
  forksCount: number;
  updatedAt: string;
  isPrivate: boolean;
}

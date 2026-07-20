// src/services/githubService.ts
import axios from 'axios';
import { cacheService } from './cacheService';
import {
  GitHubApiUser,
  GitHubApiRepo,
  GitHubApiEvent,
  PushEvent,
  GitHubProfile,
  GitHubRepo,
  isPushEvent
} from '../types/github';

const GITHUB_API = 'https://api.github.com';

// Numeric enum for cache lifetimes. Before this was three "magic number"
// literals (3600, 3600, 1800) scattered across the file with no shared
// name tying them together or explaining why events expire twice as
// fast as profile/repo data (push events change far more often).
enum CacheTTL {
  PROFILE_SECONDS = 3600,
  REPOS_SECONDS = 3600,
  EVENTS_SECONDS = 1800
}

/**
 * Fetch GitHub user profile
 */
export const getUserProfile = async (
  accessToken: string,
  username: string
): Promise<GitHubProfile> => {
  const cacheKey = `github:profile:${username}`;

  return cacheService.getOrSet<GitHubProfile>(cacheKey, CacheTTL.PROFILE_SECONDS, async () => {
    const response = await axios.get<GitHubApiUser>(`${GITHUB_API}/users/${username}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json'
      }
    });

    return {
      login: response.data.login,
      avatarUrl: response.data.avatar_url,
      publicRepos: response.data.public_repos,
      followers: response.data.followers,
      following: response.data.following,
      bio: response.data.bio,
      createdAt: response.data.created_at
    };
  });
};

/**
 * Fetch repositories
 */
export const getUserRepos = async (
  accessToken: string,
  username: string
): Promise<GitHubRepo[]> => {
  const cacheKey = `github:repos:${username}`;

  return cacheService.getOrSet<GitHubRepo[]>(cacheKey, CacheTTL.REPOS_SECONDS, async () => {
    const response = await axios.get<GitHubApiRepo[]>(`${GITHUB_API}/users/${username}/repos`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json'
      },
      params: {
        per_page: 100,
        sort: 'updated'
      }
    });

    return response.data.map((repo) => ({
      name: repo.name,
      language: repo.language,
      stargazersCount: repo.stargazers_count,
      forksCount: repo.forks_count,
      updatedAt: repo.updated_at,
      isPrivate: repo.private
    }));
  });
};

/**
 * Calculate top languages
 */
export const getTopLanguages = (repos: GitHubRepo[]): string[] => {
  const langCount: Record<string, number> = {};

  repos.forEach((repo) => {
    if (repo.language) {
      langCount[repo.language] = (langCount[repo.language] || 0) + 1;
    }
  });

  return Object.entries(langCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([lang]) => lang);
};

/**
 * Fetch commit (push) events
 */
export const getCommitEvents = async (
  accessToken: string,
  username: string
): Promise<PushEvent[]> => {
  const cacheKey = `github:events:${username}`;

  return cacheService.getOrSet<PushEvent[]>(cacheKey, CacheTTL.EVENTS_SECONDS, async () => {
    const response = await axios.get<GitHubApiEvent[]>(`${GITHUB_API}/users/${username}/events`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json'
      },
      params: {
        per_page: 100
      }
    });

    // isPushEvent is a type guard: Array.filter narrows
    // GitHubApiEvent[] down to PushEvent[] here, not just at runtime
    // but for TypeScript too - the return type lines up with the
    // PushEvent[] this function promises without a manual cast.
    return response.data.filter(isPushEvent);
  });
};

/**
 * Calculate commit streak (consecutive days with at least one push, ending today)
 */
export const calculateStreak = (pushEvents: PushEvent[]): number => {
  if (!pushEvents.length) {
    return 0;
  }

  const commitDays = new Set(pushEvents.map((event) => event.created_at.split('T')[0]));

  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);

    const dateStr = date.toISOString().split('T')[0];

    if (commitDays.has(dateStr)) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
};

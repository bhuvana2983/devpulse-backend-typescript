// src/services/cacheService.ts
//
// Why a class + generics here, specifically:
//
// Redis itself only knows about strings — every value we store gets
// JSON.stringify'd going in and JSON.parse'd coming out. That parse step
// is exactly where type safety normally falls apart: `JSON.parse` returns
// `any`, so without generics, every caller would get back an untyped
// blob and have to trust it matches what they expect.
//
// `get<T>()` / `set<T>()` let each CALL SITE say what shape it expects
// (a GitHubProfile, a GitHubRepo[], a PushEvent[]...) while the class
// itself stays completely agnostic about what it's storing. One
// implementation, type-safe for every shape we throw at it.

import { createClient, RedisClientType } from 'redis';

class CacheService {
  private client: RedisClientType;

  constructor() {
    // The redis client's types model `socket.tls` as a discriminant:
    // it's either the literal `true` (with TLS-specific fields available)
    // or omitted entirely - not a plain `boolean`. Passing the whole
    // `createClient(...)` options object as one literal (rather than
    // building `socket` as a separately-typed variable) lets TypeScript
    // infer the correct branch of that union instead of widening
    // `tls` to `boolean` and rejecting it.
    const isTls = process.env.REDIS_URL?.startsWith('rediss://') ?? false;

    this.client = isTls
      ? createClient({
          url: process.env.REDIS_URL,
          socket: { tls: true, rejectUnauthorized: false }
        })
      : createClient({
          url: process.env.REDIS_URL
        });

    this.client.on('connect', () => {
      console.log('Redis Connected');
    });

    this.client.on('error', (err: Error) => {
      console.error('Redis Error:', err);
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (err) {
      console.error('Redis Connection Failed:', err);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.client.get(key);
      return data ? (JSON.parse(data) as T) : null;
    } catch (err) {
      console.error('Cache GET Error:', err);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds = 3600): Promise<void> {
    try {
      await this.client.setEx(key, ttlSeconds, JSON.stringify(value));
    } catch (err) {
      console.error('Cache SET Error:', err);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (err) {
      console.error('Cache DELETE Error:', err);
    }
  }

  /**
   * Wraps the "check cache, fall back to a live fetch, then populate
   * the cache" pattern that used to be copy-pasted three times across
   * getUserProfile / getUserRepos / getCommitEvents in githubService.js.
   *
   * `fetchFn` is typed as `() => Promise<T>`, and whatever T it resolves
   * to is exactly what this function returns AND what gets cached -
   * TypeScript infers T from the function you pass in, so callers don't
   * need to specify it explicitly (though they can).
   */
  async getOrSet<T>(key: string, ttlSeconds: number, fetchFn: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached) {
      console.log(`Cache HIT: ${key}`);
      return cached;
    }

    console.log(`Cache MISS: ${key} — fetching live`);
    const fresh = await fetchFn();
    await this.set<T>(key, fresh, ttlSeconds);
    return fresh;
  }
}

export const cacheService = new CacheService();

// Kick off the connection at import time, same as the original module.
cacheService.connect();

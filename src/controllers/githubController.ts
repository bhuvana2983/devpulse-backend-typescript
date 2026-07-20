// src/controllers/githubController.ts
import { Request, Response } from 'express';
import * as githubService from '../services/githubService';
import User from '../models/User';

/**
 * GET /api/github/stats
 * Returns live GitHub stats for logged-in user
 */
export const getMyStats = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Not authorized' });
    return;
  }

  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const [profile, repos, events] = await Promise.all([
      githubService.getUserProfile(user.githubAccessToken, user.username),
      githubService.getUserRepos(user.githubAccessToken, user.username),
      githubService.getCommitEvents(user.githubAccessToken, user.username)
    ]);

    // Promise.all runs all 3 API calls in parallel - much faster than sequential

    const topLanguages = githubService.getTopLanguages(repos);
    const streak = githubService.calculateStreak(events);

    res.json({
      username: user.username,
      avatarUrl: profile.avatarUrl,
      publicRepos: profile.publicRepos,
      followers: profile.followers,
      following: profile.following,
      streak,
      topLanguages,
      totalEvents: events.length
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Stats error:', message);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
};

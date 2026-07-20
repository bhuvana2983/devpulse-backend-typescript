// src/controllers/dashboardController.ts
import { Request, Response } from 'express';
import ActivitySnapshot from '../models/ActivitySnapshot';
import User from '../models/User';

/**
 * GET /api/dashboard/history
 * Returns last 30 days of snapshots for logged-in user
 */
export const getHistory = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Not authorized' });
    return;
  }

  try {
    const snapshots = await ActivitySnapshot.find({ userId: req.user._id })
      .sort({ date: -1 }) // Most recent first
      .limit(30);

    res.json(snapshots);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch history' });
  }
};

/**
 * GET /api/dashboard/public/:slug
 * Public profile - no auth needed
 */
export const getPublicProfile = async (req: Request<{ slug: string }>, res: Response): Promise<void> => {
  try {
    const user = await User.findOne({ profileSlug: req.params.slug });

    if (!user) {
      res.status(404).json({ message: 'Profile not found' });
      return;
    }

    // Get latest snapshot
    const latest = await ActivitySnapshot.findOne({ userId: user._id }).sort({ date: -1 });

    res.json({
      username: user.username,
      avatarUrl: user.avatarUrl,
      profileSlug: user.profileSlug,
      latestSnapshot: latest
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
};

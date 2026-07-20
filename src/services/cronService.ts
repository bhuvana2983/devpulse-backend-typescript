// src/services/cronService.ts
import cron from 'node-cron';
import User from '../models/User';
import ActivitySnapshot from '../models/ActivitySnapshot';
import { getUserProfile, getUserRepos, getCommitEvents, getTopLanguages, calculateStreak } from './githubService';
import { sendDailyDigest } from './emailService';

/**
 * Nightly job: runs at 11 PM every day
 * For each user -> fetch GitHub data -> store snapshot -> send email
 */
export const startCronJobs = (): void => {
  cron.schedule('0 23 * * *', async () => {
    console.log('Cron started:', new Date().toISOString());

    try {
      // Fetch all users who want email digests
      const users = await User.find({ emailDigestEnabled: true });
      console.log(`Processing ${users.length} users`);

      for (const user of users) {
        try {
          // Fetch their GitHub data
          const profile = await getUserProfile(user.githubAccessToken, user.username);
          const repos = await getUserRepos(user.githubAccessToken, user.username);
          const events = await getCommitEvents(user.githubAccessToken, user.username);

          const topLanguages = getTopLanguages(repos);
          const streak = calculateStreak(events);
          const today = new Date().toISOString().split('T')[0];

          const commitsToday = events.filter((e) => e.created_at.startsWith(today)).length;

          // Save snapshot - upsert means "update if exists, insert if not"
          await ActivitySnapshot.findOneAndUpdate(
            { userId: user._id, date: today },
            {
              totalCommits: commitsToday,
              reposContributed: repos.length,
              topLanguages,
              currentStreak: streak,
              publicRepos: profile.publicRepos,
              followers: profile.followers
            },
            { upsert: true, new: true }
          );

          // Send email if they have one
          if (user.email) {
            await sendDailyDigest(user.email, user.username, {
              commits: commitsToday,
              streak,
              topLanguages,
              repos: profile.publicRepos
            });
          }

          console.log(`Processed: ${user.username}`);
        } catch (userErr) {
          // Don't let one user's failure stop others
          const message = userErr instanceof Error ? userErr.message : String(userErr);
          console.error(`Error for ${user.username}:`, message);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Cron job failed:', message);
    }
  });

  console.log('Cron jobs registered');
};

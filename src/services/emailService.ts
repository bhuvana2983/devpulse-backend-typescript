// src/services/emailService.ts
import nodemailer from 'nodemailer';

export interface DigestStats {
  commits: number;
  streak: number;
  topLanguages: string[];
  repos: number;
}

// Create reusable transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS // Gmail App Password
  }
});

/**
 * Send daily digest email to a user
 */
export const sendDailyDigest = async (
  toEmail: string,
  username: string,
  stats: DigestStats
): Promise<void> => {
  const { commits, streak, topLanguages, repos } = stats;

  const mailOptions = {
    from: `"DevPulse" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `DevPulse Daily Digest — ${new Date().toDateString()}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2 style="color: #2da44e;">DevPulse — Daily Activity Report</h2>
        <p>Hey <strong>${username}</strong>, here's your GitHub activity summary:</p>

        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background: #f6f8fa;">
            <td style="padding: 12px; border: 1px solid #ddd;">📝 Commits Today</td>
            <td style="padding: 12px; border: 1px solid #ddd;"><strong>${commits}</strong></td>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid #ddd;">🔥 Current Streak</td>
            <td style="padding: 12px; border: 1px solid #ddd;"><strong>${streak} days</strong></td>
          </tr>
          <tr style="background: #f6f8fa;">
            <td style="padding: 12px; border: 1px solid #ddd;">💻 Public Repos</td>
            <td style="padding: 12px; border: 1px solid #ddd;"><strong>${repos}</strong></td>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid #ddd;">🗣️ Top Languages</td>
            <td style="padding: 12px; border: 1px solid #ddd;"><strong>${topLanguages.join(', ') || 'N/A'}</strong></td>
          </tr>
        </table>

        <p style="margin-top: 20px; color: #666;">
          Keep the streak alive! 💪
        </p>
        <a href="${process.env.FRONTEND_URL}/profile/${username}"
           style="background: #2da44e; color: white; padding: 10px 20px;
                  text-decoration: none; border-radius: 5px;">
          View Full Dashboard
        </a>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
  console.log(`Digest sent to ${toEmail}`);
};

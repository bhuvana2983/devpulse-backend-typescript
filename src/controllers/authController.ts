// src/controllers/authController.ts
import { Request, Response } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { GitHubApiUser, GitHubApiEmail } from '../types/github';

interface GitHubTokenResponse {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

/**
 * GET /api/auth/github
 */
export const githubLogin = (_req: Request, res: Response): void => {
  const githubAuthUrl =
    `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=read:user,user:email`;

  res.redirect(githubAuthUrl);
};

/**
 * GET /api/auth/github/callback
 */
export const githubCallback = async (req: Request, res: Response): Promise<void> => {
  // req.query.code comes in typed as `string | ParsedQs | string[] | ParsedQs[] | undefined`
  // from Express's query-string parser - narrowing it to `string` up front
  // means the rest of this function can just treat `code` as a string.
  const code = typeof req.query.code === 'string' ? req.query.code : undefined;

  try {
    console.log('========== GITHUB OAUTH ==========');
    console.log('Code:', code);

    const tokenResponse = await axios.post<GitHubTokenResponse>(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code
      },
      {
        headers: {
          Accept: 'application/json'
        }
      }
    );

    console.log('Token Response:', tokenResponse.data);

    const accessToken = tokenResponse.data.access_token;

    if (!accessToken) {
      res.status(400).json({
        message: 'No access token received',
        githubResponse: tokenResponse.data
      });
      return;
    }

    const userResponse = await axios.get<GitHubApiUser>('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const githubUser = userResponse.data;

    let email: string | null = githubUser.email;

    if (!email) {
      const emailRes = await axios.get<GitHubApiEmail[]>('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const primaryEmail = emailRes.data.find((e) => e.primary && e.verified);

      email = primaryEmail?.email ?? null;
    }

    let user = await User.findOne({ githubId: String(githubUser.id) });

    if (!user) {
      user = await User.create({
        githubId: String(githubUser.id),
        username: githubUser.login,
        email: email ?? undefined,
        avatarUrl: githubUser.avatar_url,
        githubAccessToken: accessToken,
        profileSlug: githubUser.login.toLowerCase()
      });
    } else {
      user.githubAccessToken = accessToken;
      user.avatarUrl = githubUser.avatar_url;
      await user.save();
    }

    const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET as string, {
      expiresIn: '7d'
    });

    console.log('OAuth Success');

    const { githubAccessToken: _omit, ...safeUser } = user.toObject();

    res.json({
      success: true,
      token: jwtToken,
      user: safeUser
    });
  } catch (err) {
    console.error('========== GITHUB ERROR ==========');

    if (axios.isAxiosError(err)) {
      console.error('Status:', err.response?.status);
      console.error('Data:', err.response?.data);

      res.status(500).json({
        message: 'OAuth failed',
        error: err.response?.data ?? err.message
      });
      return;
    }

    const message = err instanceof Error ? err.message : String(err);
    console.error(message);

    res.status(500).json({
      message: 'OAuth failed',
      error: message
    });
  }
};

/**
 * GET /api/auth/me
 */
export const getMe = async (req: Request, res: Response): Promise<void> => {
  // req.user is typed `IUser | undefined` (see types/express.d.ts). This
  // guard is what narrows it to `IUser` for the rest of the function -
  // without it, TypeScript would correctly refuse to let us read
  // `req.user.username` below.
  if (!req.user) {
    res.status(401).json({ message: 'Not authorized' });
    return;
  }

  res.json({
    id: req.user._id,
    username: req.user.username,
    email: req.user.email,
    avatarUrl: req.user.avatarUrl,
    profileSlug: req.user.profileSlug
  });
};

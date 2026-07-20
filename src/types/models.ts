// src/types/models.ts
//
// These interfaces describe the *shape* of our two Mongoose documents.
// Keeping them here (rather than only inline in the schema files) means
// controllers/services can import just the type without pulling in
// Mongoose's runtime schema code — and it gives us one place to update
// when a field changes.

import { Document, Types } from 'mongoose';

export interface IUser extends Document {
  githubId: string;
  username: string;
  email?: string;
  avatarUrl?: string;
  githubAccessToken: string;
  profileSlug?: string;
  emailDigestEnabled: boolean;
  createdAt: Date;
}

export interface IActivitySnapshot extends Document {
  userId: Types.ObjectId;
  date: string; // "2026-05-31" — stored as a string for easy day-based querying
  totalCommits: number;
  reposContributed: number;
  topLanguages: string[];
  currentStreak: number;
  publicRepos: number;
  followers: number;
  createdAt: Date;
  updatedAt: Date;
}

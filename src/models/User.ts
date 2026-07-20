// src/models/User.ts
import { Schema, model } from 'mongoose';
import { IUser } from '../types/models';

// Schema<IUser> is the generic in action: it tells Mongoose (and every
// .find/.findOne/.create call that follows) exactly which fields exist
// and what type each one is, instead of Mongoose inferring a loose
// `any`-shaped document from the schema definition alone.
const UserSchema = new Schema<IUser>({
  githubId: {
    type: String,
    required: true,
    unique: true // No two users with same GitHub ID
  },
  username: {
    type: String,
    required: true
  },
  email: {
    type: String
  },
  avatarUrl: {
    type: String
  },
  githubAccessToken: {
    type: String, // We store this to call GitHub API on their behalf
    required: true
  },
  profileSlug: {
    type: String,
    unique: true // e.g. "torvalds" -> devpulse.com/profile/torvalds
  },
  emailDigestEnabled: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default model<IUser>('User', UserSchema);

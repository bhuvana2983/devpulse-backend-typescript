// src/types/express.d.ts
//
// Module augmentation: adds `user` to Express's Request type globally,
// so every controller/middleware sees it without importing a custom
// request type everywhere.
//
// It's typed as OPTIONAL (`user?:`) rather than required. That's a
// deliberate choice: at the *type* level, Express has no way of knowing
// that `protect` middleware ran before a given handler and guarantees
// `user` is set — that's a runtime fact, not a compile-time one. Making
// it optional forces every protected controller to actually narrow it
// (`if (!req.user) { ... }`) before use, instead of trusting an unsafe
// `req.user!` assertion that would silently produce `undefined` bugs if
// a route ever forgot to apply the middleware.

import { IUser } from './models';

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

export {};

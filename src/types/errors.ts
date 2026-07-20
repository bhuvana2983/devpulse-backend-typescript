// src/types/errors.ts
//
// A minimal error class hierarchy. We're not rewriting every try/catch
// in the app to throw these (that's a bigger refactor than "retrofit
// TypeScript"), but a couple of spots — OAuth failing to get an access
// token, and a public profile lookup that 404s — read much more clearly
// as a typed, named error than as an ad-hoc `res.status(...).json(...)`
// buried in the middle of a function.

export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(message, 404);
  }
}

export class OAuthError extends AppError {
  constructor(message = 'GitHub OAuth failed') {
    super(message, 400);
  }
}

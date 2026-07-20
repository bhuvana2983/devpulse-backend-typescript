// src/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

interface JwtPayload {
  id: string;
}

export const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  let token: string | undefined;

  // JWT sent in Authorization header as: "Bearer <token>"
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized — no token' });
    return;
  }

  try {
    // Verify the token using our secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;

    // Attach the user to the request (minus access token)
    const user = await User.findById(decoded.id).select('-githubAccessToken');

    if (!user) {
      res.status(401).json({ message: 'Not authorized — user no longer exists' });
      return;
    }

    req.user = user;

    next(); // Pass control to the next middleware/controller
  } catch (err) {
    res.status(401).json({ message: 'Not authorized — invalid token' });
  }
};

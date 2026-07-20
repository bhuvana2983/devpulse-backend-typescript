// src/routes/authRoutes.ts
import { Router } from 'express';
import { githubLogin, githubCallback, getMe } from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.get('/github', githubLogin);
router.get('/github/callback', githubCallback);
router.get('/me', protect, getMe); // protect runs BEFORE getMe

export default router;

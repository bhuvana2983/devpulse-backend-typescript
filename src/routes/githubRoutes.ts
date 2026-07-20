// src/routes/githubRoutes.ts
import { Router } from 'express';
import { getMyStats } from '../controllers/githubController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.get('/stats', protect, getMyStats);

export default router;

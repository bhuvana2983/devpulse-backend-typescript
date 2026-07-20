// src/routes/dashboardRoutes.ts
import { Router } from 'express';
import { getHistory, getPublicProfile } from '../controllers/dashboardController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.get('/history', protect, getHistory);
router.get('/public/:slug', getPublicProfile); // No protect - public route

export default router;

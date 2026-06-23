import { Router } from 'express';
import { getRecommendationsForUser } from '../controllers/recommendationController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, getRecommendationsForUser);

export default router;

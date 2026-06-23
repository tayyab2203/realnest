import { Router } from 'express';
import { getSellerAnalytics } from '../controllers/analyticsController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { requirePremiumSubscription } from '../middleware/requirePremiumSubscription.js';

const router = Router();

router.get(
  '/seller',
  authenticate,
  requireRole('SELLER'),
  requirePremiumSubscription,
  getSellerAnalytics
);

export default router;

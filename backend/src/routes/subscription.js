import { Router } from 'express';
import {
  listPlans,
  getMySubscription,
  getMySubscriptionTransactions,
  upgradeToPro,
  upgradeToAgency,
  cancelMySubscription,
} from '../controllers/subscriptionController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/plans', listPlans);
router.get('/me', authenticate, getMySubscription);
router.get('/transactions', authenticate, getMySubscriptionTransactions);
router.post('/upgrade/pro', authenticate, upgradeToPro);
router.post('/upgrade/agency', authenticate, upgradeToAgency);
router.post('/cancel', authenticate, cancelMySubscription);

export default router;

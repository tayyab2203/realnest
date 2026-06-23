import { Router } from 'express';
import {
  purchaseCredits,
  getCreditsBalance,
  spendCredits,
  boostListing,
  verifyProfile,
  expireBoostsAndListings,
  getSellerNotifications,
  renewListing,
} from '../controllers/sellerCreditsController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { requirePremiumSubscription } from '../middleware/requirePremiumSubscription.js';
import { getArchivedProperties } from '../controllers/propertyArchiveController.js';
import { getSoldProperties } from '../controllers/soldPropertiesController.js';

const router = Router();

router.post('/credits/purchase', authenticate, requireRole('SELLER'), purchaseCredits);
router.get('/credits/balance', authenticate, requireRole('SELLER'), getCreditsBalance);
router.post('/credits/spend', authenticate, requireRole('SELLER'), spendCredits);
// Boosting is a premium feature — only Pro / Agency plans may apply boosts.
router.post(
  '/listings/boost',
  authenticate,
  requireRole('SELLER'),
  requirePremiumSubscription,
  boostListing
);
router.post('/listings/renew', authenticate, requireRole('SELLER'), renewListing);
router.post('/profile/verify', authenticate, requireRole('SELLER'), verifyProfile);
router.patch('/boosts/expire', authenticate, requireRole('SELLER'), expireBoostsAndListings);
router.get('/notifications', authenticate, requireRole('SELLER'), getSellerNotifications);
router.get('/archived-properties', authenticate, requireRole('SELLER'), getArchivedProperties);
router.get('/sold-properties', authenticate, requireRole('SELLER'), getSoldProperties);

export default router;

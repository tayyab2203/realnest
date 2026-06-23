import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  createPurchaseIntent,
  getIntentForProperty,
  listBuyerPurchaseIntents,
  listSellerPurchaseIntents,
} from '../controllers/purchaseIntentController.js';

const router = Router();

router.post('/', authenticate, createPurchaseIntent);
router.get('/buyer', authenticate, listBuyerPurchaseIntents);
router.get('/seller', authenticate, listSellerPurchaseIntents);
router.get('/for-property/:propertyId', authenticate, getIntentForProperty);

export default router;

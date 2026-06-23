import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  listInstallmentsForProperty,
  startInstallmentPayment,
} from '../controllers/saleInstallmentController.js';

const router = Router();

router.get('/property/:propertyId', authenticate, listInstallmentsForProperty);
router.post('/:installmentId/start-payment', authenticate, startInstallmentPayment);

export default router;

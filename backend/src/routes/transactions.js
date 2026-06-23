import { Router } from 'express';
import {
  createTransaction,
  processTransaction,
  getTransactionById,
  getMyTransactions,
  getMySales,
} from '../controllers/transactionController.js';
import { recordOfflineSale } from '../controllers/offlineTransactionController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.post('/offline-sale', authenticate, requireRole('SELLER'), recordOfflineSale);
router.post('/create', authenticate, requireRole('BUYER'), createTransaction);
router.post('/process', authenticate, requireRole('BUYER'), processTransaction);
router.get('/mine', authenticate, requireRole('BUYER'), getMyTransactions);
router.get('/sales', authenticate, requireRole('SELLER'), getMySales);
router.get('/:id', authenticate, getTransactionById);

export default router;

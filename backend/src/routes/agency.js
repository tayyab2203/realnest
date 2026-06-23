import { Router } from 'express';
import {
  getAgencyProfile,
  updateProfile,
  getAgents,
  createAgent,
  editAgent,
  deleteAgent,
  bulkStatusUpdate,
  bulkDeleteListings,
} from '../controllers/agencyController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { requireAgencySubscription } from '../middleware/requirePremiumSubscription.js';

const router = Router();

// All agency endpoints require an active Agency / Enterprise plan.
router.use(authenticate, requireRole('SELLER'), requireAgencySubscription);

router.get('/profile', getAgencyProfile);
router.put('/profile', updateProfile);

router.get('/agents', getAgents);
router.post('/agents', createAgent);
router.put('/agents/:id', editAgent);
router.delete('/agents/:id', deleteAgent);

router.patch('/listings/bulk-status', bulkStatusUpdate);
router.delete('/listings/bulk', bulkDeleteListings);

export default router;

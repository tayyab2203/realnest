import { Router } from 'express';
import {
  trackInteraction, removeInteraction, getUserInteractions,
  saveProperty, unsaveProperty, getSavedProperties,
} from '../controllers/interactionController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.post('/track', trackInteraction);
router.delete('/track', removeInteraction);
router.get('/mine', getUserInteractions);
router.post('/save', saveProperty);
router.delete('/save/:propertyId', unsaveProperty);
router.get('/saved', getSavedProperties);

export default router;

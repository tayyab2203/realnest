import { Router } from 'express';
import {
  createProperty, getProperties, getPropertyById,
  updateProperty, deleteProperty, getMyProperties, getFeaturedProperties,
} from '../controllers/propertyController.js';
import { archiveProperty } from '../controllers/propertyArchiveController.js';
import { authenticate, optionalAuthenticate, requireRole } from '../middleware/auth.js';
import { enforceListingLimit } from '../middleware/enforceListingLimit.js';

const router = Router();

router.get('/', getProperties);
router.get('/featured', getFeaturedProperties);
router.get('/mine', authenticate, requireRole('SELLER'), getMyProperties);
router.patch('/:id/archive', authenticate, requireRole('SELLER'), archiveProperty);
router.get('/:id', optionalAuthenticate, getPropertyById);
router.post('/', authenticate, requireRole('SELLER'), enforceListingLimit, createProperty);
router.put('/:id', authenticate, requireRole('SELLER'), updateProperty);
router.delete('/:id', authenticate, requireRole('SELLER'), deleteProperty);

export default router;

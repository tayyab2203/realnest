import { Router } from 'express';
import {
  register,
  login,
  getProfile,
  updateProfile,
  ensureProfile,
} from '../controllers/authController.js';
import { authenticate, authenticateToken } from '../middleware/auth.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/ensure-profile', authenticateToken, ensureProfile);
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);

export default router;

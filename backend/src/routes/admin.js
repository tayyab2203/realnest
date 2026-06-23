import { Router } from 'express';
import { getPlatformRevenue } from '../controllers/adminController.js';
import { optionalAuthenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const router = Router();

// Optional auth so that the admin-email gate has access to req.user.profile
// when it needs it. The actual access decision lives in `requireAdmin`.
router.get('/platform-revenue', optionalAuthenticate, requireAdmin, getPlatformRevenue);

export default router;

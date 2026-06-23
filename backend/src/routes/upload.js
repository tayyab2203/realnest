import { Router } from 'express';
import multer from 'multer';
import { uploadImages } from '../controllers/uploadController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

router.post('/images', authenticate, upload.array('images', 10), uploadImages);

export default router;

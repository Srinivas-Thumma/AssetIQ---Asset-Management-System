import express from 'express';
import { getActiveBanner, createBanner } from '../controllers/platformBanner.controller.js';
import { protect, requireRole } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/active', getActiveBanner);
router.post('/', protect, requireRole('super_admin'), createBanner);

export default router;

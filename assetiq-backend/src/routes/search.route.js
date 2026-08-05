import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { tenantScope } from '../middlewares/tenant.middleware.js';
import { handleGlobalSearch } from '../controllers/search.controller.js';

const router = express.Router();

router.use(protect);
router.use(tenantScope);

router.get('/', handleGlobalSearch);

export default router;

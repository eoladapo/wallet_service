import { Router } from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import accountRoutes from './accountRoutes';
import transferRoutes from './transferRoutes';

const router = Router();

// Mount route modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/accounts', accountRoutes);
router.use('/transfers', transferRoutes);

export default router;

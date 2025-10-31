// server/src/routes/authRoutes.ts
import { Router } from 'express';
import { signup, login, googleSignIn } from '../controllers/authController';

const router = Router();

// Final URLs after index.ts mounts at /api:
// POST /api/auth/signup
// POST /api/auth/login
// POST /api/auth/google
router.post('/auth/signup', signup);
router.post('/auth/login', login);
router.post('/auth/google', googleSignIn);

export default router;

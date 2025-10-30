// src/routes/auth.ts
import { Router } from 'express';
import { signup, login, googleSignIn } from '../controllers/authController';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/google', googleSignIn); // NEW: Add this route

export default router;
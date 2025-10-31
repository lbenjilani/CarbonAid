// src/controllers/authController.ts
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import UserModel from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  // Fail fast in prod; prevents issuing weak tokens
  throw new Error('JWT_SECRET is not set');
}

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
if (!GOOGLE_CLIENT_ID) {
  console.warn('[WARN] GOOGLE_CLIENT_ID not set. Google Sign-In will fail.');
}
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

type JwtPayload = { id: string; email: string; role?: string };

// --- Helpers ---
const signAppToken = (payload: JwtPayload) =>
  jwt.sign(payload, JWT_SECRET!, { expiresIn: '1d' });

// --- Signup: email/password flow ---
export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role = 'student' } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      role?: string;
    };

    if (!name || !email || !password) {
      res.status(400).json({ error: 'name, email, password are required' });
      return;
    }

    const exists = await UserModel.findOne({ email }).lean();
    if (exists) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await UserModel.create({
      name,
      email,
      role,
      // Store hashed password in the `password` field (with select:false in schema)
      password: passwordHash,
    });

    const token = signAppToken({ id: user._id.toString(), email: user.email, role: user.role });
    const { password: _omit, ...safe } = user.toObject();

    res.status(201).json({ message: 'Signup success', token, user: safe });
  } catch (err) {
    console.error('[ERROR] Signup failed:', err);
    res.status(500).json({ error: 'Signup failed' });
  }
};

// --- Login: email/password flow ---
export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string };

  try {
    if (!email || !password) {
      res.status(400).json({ error: 'email and password are required' });
      return;
    }

    // Ensure password field is fetched even if select:false
    const user = await UserModel.findOne({ email }).select('+password');
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // If this account was made via Google, we don’t have a password
    if (!user.password) {
      res
        .status(400)
        .json({ error: 'This account was created with Google. Please use Google Sign-In.' });
      return;
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = signAppToken({ id: user._id.toString(), email: user.email, role: user.role });
    const { password: _omit, ...safe } = user.toObject();
    res.json({ message: 'Login success', token, user: safe });
  } catch (err) {
    console.error('[ERROR] Login failed:', err);
    res.status(500).json({ error: 'Login failed' });
  }
};

// --- Google Sign-In ---
export const googleSignIn = async (req: Request, res: Response): Promise<void> => {
  const { token } = req.body as { token?: string };

  try {
    if (!token) {
      res.status(400).json({ error: 'Google ID token is required' });
      return;
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      res.status(400).json({ error: 'Invalid Google token' });
      return;
    }

    const { email, name, email_verified } = payload;

    if (!email) {
      res.status(400).json({ error: 'Google token missing email' });
      return;
    }
    if (email_verified === false) {
      res.status(401).json({ error: 'Google email not verified' });
      return;
    }

    // Upsert user (no password for Google accounts)
    let user = await UserModel.findOne({ email });
    if (!user) {
      user = await UserModel.create({
        name: name || email.split('@')[0],
        email,
        role: 'student',
        password: undefined, // ensure passwordless
      });
    }

    const appToken = signAppToken({ id: user._id.toString(), email: user.email, role: user.role });
    const { password: _omit, ...safe } = user.toObject();

    res.json({ message: 'Google Sign-In successful', token: appToken, user: safe });
  } catch (error) {
    console.error('[ERROR] Google Sign-In:', error);
    res.status(500).json({ error: 'Server error during Google Sign-In' });
  }
};

// src/controllers/authController.ts (FIXED & EXPANDED)
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library'; // NEW: Import Google Auth Library
import UserModel from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
// IMPORTANT: Add your Google Client ID to your .env file
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// Your existing signup function (no changes needed)
export const signup = async (req: Request, res: Response): Promise<void> => {
  // ... your existing code
};

// Your existing login function (small fix to handle passwordless Google users)
export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  try {
    const user = await UserModel.findOne({ email });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    // FIX: Check if the user has a password. If not, they must use Google Sign-In.
    if (!user.password) {
        res.status(400).json({ error: 'This account was created with Google. Please use Google Sign-In.' });
        return;
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    const { password: _, ...safeUser } = user.toObject();
    res.json({ message: 'Login success', token, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: 'Login failed', details: err });
  }
};

// NEW FUNCTION: Handle Google Sign-In
export const googleSignIn = async (req: Request, res: Response) => {
  const { token } = req.body;
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(400).json({ error: 'Invalid Google token' });
    }
    
    const { name, email } = payload;

    // Find or create user
    let user = await UserModel.findOne({ email });

    if (!user) {
      // Create a new user if they don't exist
      user = await UserModel.create({
        name,
        email,
        // No password is set for Google users
        role: 'student', // Or derive role from logic if needed
      });
    }

    // Create our own JWT to manage the session
    const appToken = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    const { password, ...safeUser } = user.toObject();
    res.json({ message: 'Google Sign-In successful', token: appToken, user: safeUser });
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    res.status(500).json({ error: 'Server error during Google Sign-In' });
  }
};
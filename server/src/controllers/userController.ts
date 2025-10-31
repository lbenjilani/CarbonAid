// src/controllers/userController.ts
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import UserModel from '../models/User';

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, role = 'student' } = req.body as {
      name?: string; email?: string; role?: string;
    };

    if (!name || !email) {
      res.status(400).json({ error: 'name and email are required' });
      return;
    }

    const exists = await UserModel.findOne({ email }).lean();
    if (exists) {
      res.status(409).json({ error: 'Email already exists' });
      return;
    }

    const user = await UserModel.create({ name, email, role });
    res.status(201).json(user);
  } catch (err) {
    console.error('[ERROR] createUser:', err);
    res.status(400).json({ error: 'User creation failed' });
  }
};

export const getUsers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await UserModel.find().lean();
    res.json(users);
  } catch (err) {
    console.error('[ERROR] getUsers:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ error: 'Invalid user id' });
      return;
    }
    const user = await UserModel.findById(id).lean();
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  } catch (err) {
    console.error('[ERROR] getUserById:', err);
    res.status(500).json({ error: 'Error retrieving user' });
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ error: 'Invalid user id' });
      return;
    }
    await UserModel.findByIdAndDelete(id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('[ERROR] deleteUser:', err);
    res.status(500).json({ error: 'Deletion failed' });
  }
};

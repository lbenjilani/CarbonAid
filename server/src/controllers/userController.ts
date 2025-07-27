import { Request, Response } from 'express';
import UserModel from '../models/User';

// Create a dummy user
export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, role } = req.body;
    const user = new UserModel({ name, email, role });
    await user.save();
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: 'User creation failed', details: err });
  }
};

// Get all users
export const getUsers = async (_req: Request, res: Response) => {
  try {
    const users = await UserModel.find().lean();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users', details: err });
  }
};

// Get one user by ID
export const getUserById = async (req: Request, res: Response) => {
  try {
    const user = await UserModel.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Error retrieving user', details: err });
  }
};

// Delete user
export const deleteUser = async (req: Request, res: Response) => {
  try {
    await UserModel.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Deletion failed', details: err });
  }
};

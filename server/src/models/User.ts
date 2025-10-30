// src/models/User.ts (FIXED)
import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string; // CHANGE 1: Made password optional
  role: 'student' | 'mentor' | 'admin';
  createdAt: Date;
  updatedAt: Date; // CHANGE 2: Added by timestamps
}

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false }, // CHANGE 3: Set required to false
  role: { type: String, enum: ['student', 'mentor', 'admin'], default: 'student' },
}, {
  timestamps: true, // CHANGE 4: Use built-in timestamps (adds createdAt & updatedAt)
});

// Explicitly connect to the "users" collection
const UserModel = mongoose.model<IUser>('User', UserSchema, 'users');
export default UserModel;
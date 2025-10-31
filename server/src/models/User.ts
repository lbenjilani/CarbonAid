// src/models/User.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string; // hashed; not selected by default
  role: 'student' | 'mentor' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    unique: true,
    index: true,
    lowercase: true,          // normalize
    trim: true
  },
  password: { type: String, required: false, select: false }, // <-- hide by default
  role: { type: String, enum: ['student', 'mentor', 'admin'], default: 'student' },
}, { timestamps: true });

// Optional: ensure unique index (in some envs you need this explicitly)
UserSchema.index({ email: 1 }, { unique: true });

const UserModel = mongoose.model<IUser>('User', UserSchema, 'users');
export default UserModel;

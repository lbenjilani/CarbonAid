import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'student' | 'mentor' | 'admin';
  createdAt: Date;
}

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'mentor', 'admin'], default: 'student' },
  createdAt: { type: Date, default: Date.now },
});

// Explicitly connect to the "users" collection
const UserModel = mongoose.model<IUser>('User', UserSchema, 'users');
export default UserModel;

import mongoose, { Document, Schema } from 'mongoose';

export type TaskStatus = 'Added' | 'TODO' | 'Completed';
export type TaskType = 'AI generated' | 'Manual input';
export type TaskCadence = 'daily' | 'monthly' | 'yearly';

export interface IUserTask {
  _id: mongoose.Types.ObjectId;
  title: string;
  details?: string;
  cadence: TaskCadence;
  status: TaskStatus;         // Added | TODO | Completed
  type: TaskType;             // AI generated | Manual input
  meta?: {
    title?: string;
    why?: string;
    how?: string;
    impact?: string;
    difficulty?: string;
    cost?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date | null;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: 'student' | 'mentor' | 'admin';
  tasks: IUserTask[];          // <-- embedded under user
  createdAt: Date;
  updatedAt: Date;
}

const UserTaskSchema = new Schema<IUserTask>(
  {
    title: { type: String, required: true, trim: true },
    details: { type: String, default: '' },
    cadence: { type: String, enum: ['daily', 'monthly', 'yearly'], required: true },
    status: { type: String, enum: ['Added', 'TODO', 'Completed'], default: 'Added', index: true },
    type: { type: String, enum: ['AI generated', 'Manual input'], required: true, index: true },
    meta: {
      title: String,
      why: String,
      how: String,
      impact: String,
      difficulty: String,
      cost: String,
    },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: false, select: false },
    role: { type: String, enum: ['student', 'mentor', 'admin'], default: 'student' },
    tasks: { type: [UserTaskSchema], default: [] },   // <-- here
  },
  { timestamps: true }
);

const UserModel = mongoose.model<IUser>('User', UserSchema, 'users');
export default UserModel;

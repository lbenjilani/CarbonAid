import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ['student', 'mentor', 'admin'], default: 'student' },
  createdAt: { type: Date, default: Date.now },
});

const UserModel = mongoose.model('User', UserSchema, 'users');
export default UserModel;

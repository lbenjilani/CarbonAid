// server/src/routes/userRoutes.ts
import express from 'express';
import {
  createUser,
  getUsers,
  getUserById,
  deleteUser
} from '../controllers/userController';

const router = express.Router();

// /api/users, /api/users/:id
router.post('/users', createUser);
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.delete('/users/:id', deleteUser);

export default router;

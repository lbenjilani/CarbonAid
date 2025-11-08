import { Request, Response } from 'express';
import mongoose from 'mongoose';
import UserModel from '../models/User';

const asObjectId = (id?: string) =>
  (id && mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null);

export async function list(req: Request, res: Response) {
  const userId = asObjectId(String(req.header('x-user-id') || ''));
  if (!userId) return res.status(400).json({ message: 'Invalid x-user-id' });

  const user = await UserModel.findById(userId, { tasks: 1 }).lean();
  return res.json(user?.tasks ?? []);
}

export async function create(req: Request, res: Response) {
  const userId = asObjectId(String(req.header('x-user-id') || ''));
  if (!userId) return res.status(400).json({ message: 'Invalid x-user-id' });

  const { title, details = '', cadence, status = 'Added', type, meta } = req.body || {};
  if (!title || !cadence || !type) {
    return res.status(400).json({ message: 'title, cadence, and type are required' });
  }

  const user = await UserModel.findById(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });

  const task = {
    _id: new mongoose.Types.ObjectId(),
    title: String(title).trim(),
    details: String(details || ''),
    cadence,
    status,
    type,
    meta: meta || {},
    completedAt: status === 'Completed' ? new Date() : null,
  } as any;

  user.tasks.unshift(task);
  // ensure Mongoose sees the array as modified when using array ops
  user.markModified('tasks');
  await user.save();

  return res.status(201).json(task);
}

export async function update(req: Request, res: Response) {
  const userId = asObjectId(String(req.header('x-user-id') || ''));
  const taskId = asObjectId(String(req.params.taskId || ''));
  if (!userId || !taskId) return res.status(400).json({ message: 'Invalid id' });

  const payload = req.body || {};
  const user = await UserModel.findById(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });

  // Find by _id using array ops (avoid .id() to keep TS happy)
  const idx = user.tasks.findIndex((t: any) => t._id?.toString() === taskId.toString());
  if (idx === -1) return res.status(404).json({ message: 'Task not found' });

  const t: any = user.tasks[idx];

  if (payload.title !== undefined) t.title = String(payload.title).trim();
  if (payload.details !== undefined) t.details = String(payload.details || '');
  if (payload.cadence !== undefined) t.cadence = payload.cadence;
  if (payload.type !== undefined) t.type = payload.type;
  if (payload.meta !== undefined) t.meta = payload.meta;

  if (payload.status !== undefined) {
    t.status = payload.status;
    t.completedAt = payload.status === 'Completed' ? (payload.completedAt ? new Date(payload.completedAt) : new Date()) : null;
  }

  user.tasks[idx] = t;
  user.markModified('tasks');
  await user.save();

  // Return the updated subdoc
  return res.json(t);
}

export async function remove(req: Request, res: Response) {
  const userId = asObjectId(String(req.header('x-user-id') || ''));
  const taskId = asObjectId(String(req.params.taskId || ''));
  if (!userId || !taskId) return res.status(400).json({ message: 'Invalid id' });

  const user = await UserModel.findById(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });

  const idx = user.tasks.findIndex((t: any) => t._id?.toString() === taskId.toString());
  if (idx === -1) return res.status(404).json({ message: 'Task not found' });

  user.tasks.splice(idx, 1);
  user.markModified('tasks');
  await user.save();

  return res.json({ ok: true });
}

/**
 * Bulk replace tasks with payload array.
 * Keeps/assigns _id and normalizes fields. Ideal for your "Save Goals" button.
 */
export async function bulkReplace(req: Request, res: Response) {
  const userId = asObjectId(String(req.header('x-user-id') || ''));
  if (!userId) return res.status(400).json({ message: 'Invalid x-user-id' });

  const tasks = Array.isArray(req.body?.tasks) ? req.body.tasks : [];

  const user = await UserModel.findById(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });

  user.tasks = tasks.map((t: any) => {
    const _id =
      t._id && mongoose.Types.ObjectId.isValid(t._id)
        ? new mongoose.Types.ObjectId(t._id)
        : new mongoose.Types.ObjectId();

    const status = t.status || 'Added';
    const completedAt =
      status === 'Completed'
        ? (t.completedAt ? new Date(t.completedAt) : new Date())
        : null;

    return {
      _id,
      title: String(t.title || '').trim(),
      details: String(t.details || ''),
      cadence: t.cadence,
      status,
      type: t.type,
      meta: t.meta || {},
      completedAt,
    };
  }) as any;

  user.markModified('tasks');
  await user.save();

  // Return normalized tasks (will include _id)
  return res.json(user.tasks);
}

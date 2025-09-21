import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import AISuggestion from '../models/AISuggestion';

const router = Router();

// dev shim (same as quizRoutes)
router.use((req, _res, next) => {
  const raw = (req.header('x-user-id') || '').trim();
  (req as any).userId = mongoose.isValidObjectId(raw)
    ? new mongoose.Types.ObjectId(raw)
    : new mongoose.Types.ObjectId('66e000000000000000000001');
  next();
});

const TipSchema = z.object({
  title: z.string().min(1),
  why: z.string().min(1),
  how: z.string().min(1),
  impact: z.string().min(1),
  difficulty: z.string().min(1),
  cost: z.string().min(1),
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId as mongoose.Types.ObjectId;
    const parsed = z.object({ tips: z.array(TipSchema).min(1).max(10) }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const doc = await AISuggestion.create({ userId, tips: parsed.data.tips });
    res.status(201).json({ id: doc._id });
    return;
  } catch (e) {
    console.error('save ai suggestions failed:', e);
    res.status(500).json({ error: 'failed to save' });
    return;
  }
});

router.get('/latest', async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId as mongoose.Types.ObjectId;
  const latest = await AISuggestion.findOne({ userId }).sort({ createdAt: -1 }).lean();
  res.json(latest ?? null);
  return;
});

export default router;

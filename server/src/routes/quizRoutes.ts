import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import Quiz from '../models/Quiz';
import mongoose from 'mongoose';

const router = Router();

// --- Dev-only auth shim (replace later) ---
router.use((req: Request, _res: Response, next: NextFunction) => {
  const raw = (req.header('x-user-id') || '').trim();
  (req as any).userId = mongoose.isValidObjectId(raw)
    ? new mongoose.Types.ObjectId(raw)
    : new mongoose.Types.ObjectId('66e000000000000000000001');
  next();
});

const submissionSchema = z.object({
  basic: z.object({
    householdSize: z.coerce.number().int().positive().optional(),
    postcode: z.string().max(120).optional(),
    period: z.enum(['Last 30 days','Last 90 days','Last 12 months']).optional(),
  }).partial().optional(),
  transport: z.object({
    carFuel: z.enum(['Petrol','Diesel','Hybrid','Electric']).optional(),
    carKm: z.coerce.number().nonnegative().optional(),
    carEfficiency: z.coerce.number().nonnegative().optional(),
    busKm: z.coerce.number().nonnegative().optional(),
    railKm: z.coerce.number().nonnegative().optional(),
    shortFlights: z.coerce.number().int().nonnegative().optional(),
    longFlights: z.coerce.number().int().nonnegative().optional(),
  }).partial().optional(),
  energy: z.object({
    elecKwh: z.coerce.number().nonnegative().optional(),
    tariff: z.string().max(120).optional(),
    solar: z.enum(['None','Solar PV (roof)','Community solar']).optional(),
    heatType: z.enum(['Natural Gas','Heating Oil','Electric (Heat Pump)','Electric (Resistive)','District Heating','Biomass']).optional(),
    gasKwh: z.coerce.number().nonnegative().optional(),
    homeArea: z.coerce.number().nonnegative().optional(),
  }).partial().optional(),
  diet: z.object({
    dietType: z.enum(['Omnivore (meat daily)','Reduced-meat (few times/week)','Pescatarian','Vegetarian','Vegan']).optional(),
    eatingOut: z.coerce.number().nonnegative().optional(),
    foodWaste: z.coerce.number().nonnegative().optional(),
    localShare: z.coerce.number().min(0).max(100).optional(),
    organicShare: z.coerce.number().min(0).max(100).optional(),
  }).partial().optional(),
  consumption: z.object({
    clothesItems: z.coerce.number().nonnegative().optional(),
    electronicsSpend: z.coerce.number().nonnegative().optional(),
    recycleRate: z.coerce.number().min(0).max(100).optional(),
    trashKg: z.coerce.number().nonnegative().optional(),
  }).partial().optional(),
  meta: z.object({
    version: z.coerce.number().int().positive().default(1),
    period: z.enum(['Last 30 days','Last 90 days','Last 12 months']).optional(),
    source: z.enum(['web','mobile','admin']).default('web'),
  }).partial().optional(),
}).strict();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const parsed = submissionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const userId = (req as any).userId as mongoose.Types.ObjectId;

  const doc = await Quiz.create({
    userId,
    ...parsed.data,
    meta: {
      ...parsed.data.meta,
      submittedAt: new Date(),
      version: parsed.data.meta?.version ?? 1,
      source: parsed.data.meta?.source ?? 'web',
    },
    raw: req.body, // optional safety net
  });

  res.status(201).json({ id: doc._id });
});

router.get('/latest', async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId as mongoose.Types.ObjectId;
  const latest = await Quiz.findOne({ userId }).sort({ 'meta.submittedAt': -1 }).lean();
  res.json(latest ?? null);
});

router.get('/history', async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).userId as mongoose.Types.ObjectId;
  const page = Number(req.query.page ?? 1);
  const size = Number(req.query.size ?? 20);

  const items = await Quiz.find({ userId })
    .sort({ 'meta.submittedAt': -1 })
    .skip((page - 1) * size)
    .limit(size)
    .lean();

  res.json({ page, size, items });
});

export default router;

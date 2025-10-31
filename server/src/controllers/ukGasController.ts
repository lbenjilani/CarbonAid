// src/controllers/ukGasController.ts
import { Request, Response } from 'express';
import UkGasModel from '../models/ukGasModel';

type YearValue = { year: number; value: number };

export const createUkGas = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sector, subsector, category, data } = req.body as {
      sector?: string;
      subsector?: string;
      category?: string;
      data?: YearValue[];
    };

    // STRICT: subsector is required (schema requires it)
    if (!sector || !subsector || !category || !Array.isArray(data)) {
      res.status(400).json({
        error: 'sector, subsector, category, data[] are required',
      });
      return;
    }

    // Validate data array items
    for (const item of data) {
      if (
        typeof item?.year !== 'number' ||
        !Number.isFinite(item.year) ||
        typeof item?.value !== 'number' ||
        !Number.isFinite(item.value)
      ) {
        res.status(400).json({
          error: 'Each data item must be { year: number, value: number }',
        });
        return;
      }
    }

    const doc = new UkGasModel({ sector, subsector, category, data });
    await doc.save();
    res.status(201).json(doc);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[ERROR] createUkGas:', err);
    res.status(400).json({ error: 'Creation failed' });
  }
};

// GET /api/ukgas/categories
export const getAllCategories = async (_req: Request, res: Response): Promise<void> => {
  try {
    const categories = await UkGasModel.find().distinct('category');
    res.json(categories);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[ERROR] getAllCategories:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

// GET /api/ukgas
export const getUkGas = async (_req: Request, res: Response): Promise<void> => {
  try {
    const data = await UkGasModel.find().lean();
    res.json(data);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[ERROR] getUkGas:', err);
    res.status(500).json({ error: 'Retrieval failed' });
  }
};

// GET /api/ukgas/:category
export const getUkGasByCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const category = decodeURIComponent(req.params.category);
    const doc = await UkGasModel.findOne({ category }).lean<{ data?: YearValue[] }>();
    if (!doc) {
      res.status(404).json({ error: `No data found for category: ${category}` });
      return;
    }
    res.json(doc.data ?? []);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[ERROR] getUkGasByCategory:', err);
    res.status(500).json({ error: 'Retrieval failed' });
  }
};

// GET /api/ukgas/latest-breakdown
export const getLatestBreakdown = async (_req: Request, res: Response): Promise<void> => {
  try {
    const records = await UkGasModel.find({}).lean<{ category: string; data?: YearValue[] }[]>();
    if (!records || records.length === 0) {
      res.status(404).json({ error: 'No data found' });
      return;
    }

    // Gather numeric years from all records
    const yearSet = new Set<number>();
    for (const r of records) {
      (r.data ?? []).forEach((e) => {
        if (typeof e.year === 'number' && Number.isFinite(e.year)) {
          yearSet.add(e.year);
        }
      });
    }

    if (yearSet.size === 0) {
      res.status(404).json({ error: 'No year data found' });
      return;
    }

    const latestYear = [...yearSet].sort((a, b) => b - a)[0];

    // Compute breakdown for that latest year
    const breakdown = records.map((doc) => {
      const latest = (doc.data ?? []).find((e) => e.year === latestYear);
      return { name: doc.category, value: latest?.value ?? 0 };
    });

    res.json({ year: latestYear, breakdown });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[ERROR] getLatestBreakdown:', err);
    res.status(500).json({ error: 'Failed to aggregate breakdown' });
  }
};

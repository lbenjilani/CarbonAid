import { Request, Response } from 'express';
import UkGasModel from '../models/ukGasModel';

export const createUkGas = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sector, subsector, category, data } = req.body;
    const doc = new UkGasModel({ sector, subsector, category, data });
    await doc.save();
    res.status(201).json(doc);
  } catch (err) {
    res.status(400).json({ error: 'Creation failed', details: err });
  }
};

// GET /api/ukgas/categories
export const getAllCategories = async (_req: Request, res: Response): Promise<void> => {
  try {
    const categories = await UkGasModel.find().distinct('category');
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories', details: err });
  }
};

export const getUkGas = async (_req: Request, res: Response): Promise<void> => {
  try {
    const data = await UkGasModel.find().lean();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Retrieval failed', details: err });
  }
};

// GET /api/ukgas/:category
export const getUkGasByCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const category = decodeURIComponent(req.params.category);
    const data = await UkGasModel.findOne({ category }).lean();
    if (!data) {
      res.status(404).json({ error: `No data found for category: ${category}` });
    } else {
      res.json(data.data); // assume data field contains { year: value, ... }
    }
  } catch (err) {
    res.status(500).json({ error: 'Retrieval failed', details: err });
  }
};

// GET /api/ukgas/latest-breakdown
export const getLatestBreakdown = async (_req: Request, res: Response): Promise<void> => {
  try {
    const records = await UkGasModel.find({}).lean();
    console.log('[DEBUG] Total records fetched:', records.length);

    if (!records || records.length === 0) {
      console.warn('[WARN] No records found in database.');
      res.status(404).json({ error: 'No data found' });
      return;
    }

    // Step 1: Find all unique years across all documents
    const allYears = records
      .flatMap(doc => doc.data.map((entry: any) => entry.year))
      .filter((year, i, arr) => arr.indexOf(year) === i); // remove duplicates
    console.log('[DEBUG] All unique years found:', allYears);

    const latestYear = allYears.sort().reverse()[0]; // latest year
    console.log('[DEBUG] Determined latest year:', latestYear);

    // Step 2: Extract latest value per category
    const breakdown = records.map(doc => {
      const latestEntry = doc.data.find((entry: any) => entry.year === latestYear);
      const value = latestEntry?.value ?? 0;
      console.log(`[DEBUG] ${doc.category}: ${value}`);
      return {
        name: doc.category,
        value
      };
    });

    console.log('[DEBUG] Final breakdown:', breakdown);
    res.json(breakdown);
  } catch (err) {
    console.error('[ERROR] Breakdown aggregation failed:', err);
    res.status(500).json({ error: 'Failed to aggregate breakdown', details: err });
  }
};
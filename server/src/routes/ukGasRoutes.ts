import express from 'express';
import { createUkGas, getUkGas, getUkGasByCategory, getLatestBreakdown, getAllCategories } from '../controllers/ukGasController';

const router = express.Router();

router.post('/ukgas', createUkGas);
router.get('/ukgas/categories', getAllCategories);
router.get('/ukgas/latest-breakdown', getLatestBreakdown);
router.get('/ukgas', getUkGas);
router.get('/ukgas/:category', getUkGasByCategory);

export default router;

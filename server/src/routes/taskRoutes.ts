import { Router } from 'express';
import * as TaskController from '../controllers/taskController';

const router = Router();

// Expect x-user-id header (ObjectId string)
router.get('/', TaskController.list);
router.post('/', TaskController.create);
router.patch('/:taskId', TaskController.update);
router.delete('/:taskId', TaskController.remove);

// Replace all tasks with payload (atomic sync)
router.post('/bulk', TaskController.bulkReplace);

export default router;

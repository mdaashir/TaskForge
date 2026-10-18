import { Router } from 'express';
import task from '../controllers/taskController.ts';
import { authorize, Role } from '../middlewares/authMiddleware.ts';
import { validateRequestBody } from '../middlewares/validateRequestBody.ts';
import { createTaskSchema, updateTaskSchema } from '../schemas/taskSchemas.ts';

const router = Router();

const anyAuthenticated = [Role.Admin, Role.Viewer, Role.User];

router.use(authorize(anyAuthenticated));

router.get('/mine', task.listMyTasks);
router.get('/', task.listTasks);
router.get('/:id', task.getTaskById);
router.post('/', validateRequestBody(createTaskSchema), task.createTask);
router.put('/:id', validateRequestBody(updateTaskSchema), task.updateTask);
router.delete('/:id', task.deleteTask);

export default router;

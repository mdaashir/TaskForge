import { Router } from 'express';
import report from '../controllers/reportController.ts';
import { authorize, Role } from '../middlewares/authMiddleware.ts';

const router = Router();

const anyAuthenticated = [Role.Admin, Role.Viewer, Role.User];

router.use(authorize(anyAuthenticated));

router.get('/tasks', report.exportTasks);
router.get('/projects', report.exportProjects);

export default router;

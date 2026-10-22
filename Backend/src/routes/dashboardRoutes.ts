import { Router } from 'express';
import dashboard from '../controllers/dashboardController.ts';
import { authorize, Role } from '../middlewares/authMiddleware.ts';

const router = Router();

const anyAuthenticated = [Role.Admin, Role.Viewer, Role.User];

router.use(authorize(anyAuthenticated));

router.get('/', dashboard.getDashboard);

export default router;

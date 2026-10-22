import { Router } from 'express';
import audit from '../controllers/auditController.ts';
import { authorize, Role } from '../middlewares/authMiddleware.ts';

const router = Router();

router.use(authorize([Role.Admin]));

router.get('/', audit.listAudit);

export default router;

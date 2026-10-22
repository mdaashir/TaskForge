import { Router } from 'express';
import workflow from '../controllers/workflowController.ts';
import { authorize, Role } from '../middlewares/authMiddleware.ts';
import { validateRequestBody } from '../middlewares/validateRequestBody.ts';
import { createWorkflowSchema, updateWorkflowSchema } from '../schemas/workflowSchemas.ts';

const router = Router();

const anyAuthenticated = [Role.Admin, Role.Viewer, Role.User];

router.use(authorize(anyAuthenticated));

router.get('/', workflow.listWorkflows);
router.get('/:id', workflow.getWorkflowById);
router.post('/', validateRequestBody(createWorkflowSchema), workflow.createWorkflow);
router.put('/:id', validateRequestBody(updateWorkflowSchema), workflow.updateWorkflow);
router.delete('/:id', workflow.deleteWorkflow);

export default router;

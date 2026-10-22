import { Router } from 'express';
import project from '../controllers/projectController.ts';
import { authorize, Role } from '../middlewares/authMiddleware.ts';
import { validateRequestBody } from '../middlewares/validateRequestBody.ts';
import { createProjectSchema, updateProjectSchema } from '../schemas/projectSchemas.ts';

const router = Router();

const anyAuthenticated = [Role.Admin, Role.Viewer, Role.User];

router.use(authorize(anyAuthenticated));

router.get('/', project.listProjects);
router.get('/:id', project.getProjectById);
router.post('/', validateRequestBody(createProjectSchema), project.createProject);
router.put('/:id', validateRequestBody(updateProjectSchema), project.updateProject);
router.put('/:id/archive', project.archiveProject);
router.put('/:id/restore', project.restoreProject);
router.delete('/:id', project.deleteProject);

export default router;

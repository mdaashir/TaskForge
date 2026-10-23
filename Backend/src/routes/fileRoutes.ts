import { Router } from 'express';
import file from '../controllers/fileController.ts';
import { authorize, Role } from '../middlewares/authMiddleware.ts';
import { uploadSingleFile } from '../middlewares/uploadMiddleware.ts';

const router = Router();

const anyAuthenticated = [Role.Admin, Role.Viewer, Role.User];

router.use(authorize(anyAuthenticated));

router.post('/tasks/:taskId', uploadSingleFile, file.uploadTaskFile);
router.get('/tasks/:taskId', file.listTaskFiles);
router.post('/projects/:projectId', uploadSingleFile, file.uploadProjectFile);
router.get('/projects/:projectId', file.listProjectFiles);
router.post('/comments/:commentId', uploadSingleFile, file.uploadCommentFile);
router.get('/comments/:commentId', file.listCommentFiles);
router.get('/:id', file.downloadFile);
router.delete('/:id', file.deleteFile);

export default router;

import { Router } from 'express';
import comment from '../controllers/commentController.ts';
import { authorize, Role } from '../middlewares/authMiddleware.ts';
import { validateRequestBody } from '../middlewares/validateRequestBody.ts';
import { createCommentSchema, updateCommentSchema } from '../schemas/commentSchemas.ts';

const router = Router();

const anyAuthenticated = [Role.Admin, Role.Viewer, Role.User];

router.use(authorize(anyAuthenticated));

router.get('/tasks/:taskId', comment.listTaskComments);
router.post(
    '/tasks/:taskId',
    validateRequestBody(createCommentSchema),
    comment.createComment
);
router.put('/:id', validateRequestBody(updateCommentSchema), comment.updateComment);
router.delete('/:id', comment.deleteComment);

export default router;

import { Router } from 'express';
import user from '../controllers/userController.ts';
import { authorize, Role } from '../middlewares/authMiddleware.ts';
import { validateRequestBody } from '../middlewares/validateRequestBody.ts';
import { createUserSchema, updateUserSchema } from '../schemas/userSchemas.ts';

const router = Router();

router.use(authorize([Role.Admin]));

router.get('/', user.listUsers);
router.get('/:id', user.getUserById);
router.post('/', validateRequestBody(createUserSchema), user.createUser);
router.put('/:id', validateRequestBody(updateUserSchema), user.updateUser);
router.delete('/:id', user.deleteUser);

export default router;

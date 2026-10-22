import { Router } from 'express';
import auth from '../controllers/authController.ts';
import { authorize, Role } from '../middlewares/authMiddleware.ts';
import { validateRequestBody } from '../middlewares/validateRequestBody.ts';
import { loginSchema, registerSchema, updateProfileSchema } from '../schemas/authSchemas.ts';

const router = Router();

const anyAuthenticated = [Role.Admin, Role.Viewer, Role.User];

router.post('/register', validateRequestBody(registerSchema), auth.registerUser);
router.post('/login', validateRequestBody(loginSchema), auth.loginUser);
router.post('/refresh', auth.refreshAccessToken);
router.post('/logout', auth.logoutUser);
router.post('/logout-all', authorize(anyAuthenticated), auth.logoutAll);
router.get('/profile', authorize(anyAuthenticated), auth.getUserProfile);
router.put(
    '/profile',
    authorize(anyAuthenticated),
    validateRequestBody(updateProfileSchema),
    auth.updateUserProfile
);
router.get('/profile/image/:value', auth.getProfileImage);

export default router;

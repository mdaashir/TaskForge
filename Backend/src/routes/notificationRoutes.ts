import { Router } from 'express';
import notification from '../controllers/notificationController.ts';
import { authorize, Role } from '../middlewares/authMiddleware.ts';

const router = Router();

const anyAuthenticated = [Role.Admin, Role.Viewer, Role.User];

router.use(authorize(anyAuthenticated));

router.get('/', notification.listNotifications);
router.get('/unread-count', notification.getUnreadCount);
router.put('/seen-all', notification.markAllNotificationsSeen);
router.put('/:id/seen', notification.markNotificationSeen);

export default router;

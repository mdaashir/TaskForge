import type { RequestWithUser } from '../types.ts';
import type { Response } from 'express';
import type { Types } from 'mongoose';
import notificationService from '../services/notificationService.ts';

const serverError = (res: Response, error: unknown) =>
    res.status(500).json({
        message: 'Server error',
        error: error instanceof Error ? error.message : String(error),
    });

async function listNotifications(req: RequestWithUser, res: Response) {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authorized' });

        const unreadOnly = req.query.unread === 'true';
        const limit = Number(req.query.limit) || 20;
        const result = await notificationService.listForUser(
            req.user._id as Types.ObjectId,
            { unreadOnly, limit }
        );

        return res.status(200).json(result);
    } catch (error) {
        return serverError(res, error);
    }
}

async function getUnreadCount(req: RequestWithUser, res: Response) {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authorized' });

        const result = await notificationService.unreadCount(req.user._id as Types.ObjectId);
        return res.status(200).json(result);
    } catch (error) {
        return serverError(res, error);
    }
}

async function markNotificationSeen(req: RequestWithUser, res: Response) {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authorized' });

        const result = await notificationService.markSeen(
            req.params.id,
            req.user._id as Types.ObjectId
        );
        if ('message' in result) return res.status(404).json({ message: result.message });

        return res.status(200).json({ message: 'Notification marked as seen.' });
    } catch (error) {
        return serverError(res, error);
    }
}

async function markAllNotificationsSeen(req: RequestWithUser, res: Response) {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authorized' });

        const result = await notificationService.markAllSeen(req.user._id as Types.ObjectId);
        return res.status(200).json({ message: 'Notifications marked as seen.', ...result });
    } catch (error) {
        return serverError(res, error);
    }
}

export default { listNotifications, getUnreadCount, markNotificationSeen, markAllNotificationsSeen };

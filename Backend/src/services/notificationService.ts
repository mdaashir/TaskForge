import { Types } from 'mongoose';
import notificationModel from '../models/Notification.ts';
import type { IUser } from '../types.ts';

interface NotifyPayload {
    entity: string;
    message: string;
    targetId?: Types.ObjectId;
    priority?: string;
    status?: string;
}

const uniqueRecipients = (recipients: (Types.ObjectId | string | undefined)[], fromId: unknown) => {
    const seen = new Set<string>();
    const result: string[] = [];

    for (const recipient of recipients) {
        if (!recipient) continue;
        const id = String(recipient);
        if (id === String(fromId) || seen.has(id)) continue;
        seen.add(id);
        result.push(id);
    }

    return result;
};

async function notifyUsers(
    actor: IUser,
    recipients: (Types.ObjectId | string | undefined)[],
    payload: NotifyPayload
) {
    try {
        const toIds = uniqueRecipients(recipients, actor._id);
        if (toIds.length === 0) return;

        const now = new Date();
        await notificationModel.insertMany(
            toIds.map((toId) => ({
                fromId: actor._id,
                toId,
                targetId: payload.targetId,
                entity: payload.entity,
                message: payload.message,
                priority: payload.priority,
                status: payload.status,
                read: [{ userId: toId, received: true, receivedAt: now, seen: false, seenAt: now }],
                readCount: 0,
            }))
        );
    } catch {
        // Notifications are best-effort: never fail the action that triggered them.
    }
}

async function listForUser(
    userId: Types.ObjectId,
    options: { unreadOnly?: boolean; limit?: number } = {}
) {
    const filter: Record<string, unknown> = { toId: userId };
    if (options.unreadOnly) filter.readCount = 0;

    const notifications = await notificationModel
        .find(filter)
        .populate('fromId', 'name email')
        .sort({ createdAt: -1 })
        .limit(Math.min(100, Math.max(1, options.limit ?? 20)));

    return { notifications };
}

async function unreadCount(userId: Types.ObjectId) {
    const count = await notificationModel.countDocuments({ toId: userId, readCount: 0 });
    return { count };
}

async function markSeen(notificationId: string, userId: Types.ObjectId) {
    if (!Types.ObjectId.isValid(notificationId)) return { message: 'Invalid notification ID.' };

    const notification = await notificationModel.findOne({
        _id: notificationId,
        toId: userId,
    });
    if (!notification) return { message: 'Notification not found.' };

    notification.readCount = 1;
    if (notification.read?.[0]) {
        notification.read[0].seen = true;
        notification.read[0].seenAt = new Date();
    }
    await notification.save();

    return { success: true as const };
}

async function markAllSeen(userId: Types.ObjectId) {
    const result = await notificationModel.updateMany(
        { toId: userId, readCount: 0 },
        { $set: { readCount: 1, 'read.0.seen': true, 'read.0.seenAt': new Date() } }
    );
    return { marked: result.modifiedCount };
}

export default { notifyUsers, listForUser, unreadCount, markSeen, markAllSeen };

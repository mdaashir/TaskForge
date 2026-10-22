import type { AppNotification } from '../types.ts';
import { API_PATHS } from './apiPaths.ts';
import axiosInstance from './axiosInstance.ts';

export const fetchNotifications = async (limit = 20): Promise<AppNotification[]> => {
    const { data } = await axiosInstance.get<{ notifications: AppNotification[] }>(
        API_PATHS.notifications.list,
        { params: { limit } }
    );
    return data.notifications;
};

export const fetchUnreadCount = async (): Promise<number> => {
    const { data } = await axiosInstance.get<{ count: number }>(
        API_PATHS.notifications.unreadCount
    );
    return data.count;
};

export const markNotificationSeen = async (notificationId: string): Promise<void> => {
    await axiosInstance.put(API_PATHS.notifications.seen(notificationId));
};

export const markAllNotificationsSeen = async (): Promise<void> => {
    await axiosInstance.put(API_PATHS.notifications.seenAll);
};

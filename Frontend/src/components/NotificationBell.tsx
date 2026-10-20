import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { FiBell } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth.ts';
import type { AppNotification } from '../types.ts';
import { getErrorMessage, relativeTime } from '../utils/helper.ts';
import {
    fetchNotifications,
    fetchUnreadCount,
    markAllNotificationsSeen,
    markNotificationSeen,
} from '../utils/notifications.ts';

const POLL_MS = 60000;

const NotificationBell = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const containerRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [unread, setUnread] = useState(0);
    const [items, setItems] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(false);

    const loadCount = useCallback(async () => {
        try {
            setUnread(await fetchUnreadCount());
        } catch {
            // polling errors are not worth interrupting the user
        }
    }, []);

    useEffect(() => {
        void loadCount();
        const timer = setInterval(() => {
            void loadCount();
        }, POLL_MS);
        return () => clearInterval(timer);
    }, [loadCount]);

    useEffect(() => {
        if (!open) return;
        const handler = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const loadItems = async () => {
        setLoading(true);
        try {
            setItems(await fetchNotifications(20));
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    const toggle = () => {
        const next = !open;
        setOpen(next);
        if (next) void loadItems();
    };

    const handleOpen = async (item: AppNotification) => {
        setOpen(false);
        try {
            if (item.readCount === 0) {
                await markNotificationSeen(item._id);
                setUnread((previous) => Math.max(0, previous - 1));
            }
        } catch {
            // best effort: navigation still makes sense
        }
        if (item.targetId) {
            navigate(
                user?.memberType === 'ADMIN'
                    ? `/tasks/edit/${item.targetId}`
                    : `/user/tasks/details/${item.targetId}`
            );
        }
    };

    const markAll = async () => {
        try {
            await markAllNotificationsSeen();
            setUnread(0);
            await loadItems();
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={toggle}
                title="Notifications"
                className="relative rounded-lg border border-slate-300 p-2 text-slate-600"
            >
                <FiBell />
                {unread > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
                        {unread > 99 ? '99+' : unread}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-lg">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                        <span className="text-sm font-medium text-slate-700">Notifications</span>
                        <button
                            type="button"
                            onClick={markAll}
                            className="text-xs font-medium text-primary"
                        >
                            Mark all read
                        </button>
                    </div>
                    <ul className="max-h-80 overflow-y-auto">
                        {loading ? (
                            <li className="px-4 py-6 text-center text-sm text-slate-400">
                                Loading…
                            </li>
                        ) : items.length === 0 ? (
                            <li className="px-4 py-6 text-center text-sm text-slate-400">
                                No notifications
                            </li>
                        ) : (
                            items.map((item) => (
                                <li key={item._id}>
                                    <button
                                        type="button"
                                        onClick={() => handleOpen(item)}
                                        className={`w-full px-4 py-3 text-left text-sm hover:bg-slate-50 ${
                                            item.readCount === 0 ? 'bg-blue-50/50' : ''
                                        }`}
                                    >
                                        <span className="block text-slate-700">{item.message}</span>
                                        <span className="mt-0.5 block text-xs text-slate-400">
                                            {relativeTime(item.createdAt)}
                                        </span>
                                    </button>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;

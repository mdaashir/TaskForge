const AUTH = '/auth';
const USERS = '/users';
const PROJECTS = '/projects';
const TASKS = '/tasks';
const REPORTS = '/reports';
const FILES = '/files';
const COMMENTS = '/comments';
const NOTIFICATIONS = '/notifications';
const AUDIT = '/audit';
const WORKFLOWS = '/workflows';

export const API_PATHS = {
    auth: {
        register: `${AUTH}/register`,
        login: `${AUTH}/login`,
        refresh: `${AUTH}/refresh`,
        logout: `${AUTH}/logout`,
        logoutAll: `${AUTH}/logout-all`,
        profile: `${AUTH}/profile`,
        profileImage: (value: string) => `${AUTH}/profile/image/${encodeURIComponent(value)}`,
    },
    dashboard: '/dashboard',
    users: {
        list: USERS,
        options: `${USERS}/options`,
        byId: (id: string) => `${USERS}/${id}`,
        archive: (id: string) => `${USERS}/${id}/archive`,
        restore: (id: string) => `${USERS}/${id}/restore`,
    },
    projects: {
        list: PROJECTS,
        byId: (id: string) => `${PROJECTS}/${id}`,
        archive: (id: string) => `${PROJECTS}/${id}/archive`,
        restore: (id: string) => `${PROJECTS}/${id}/restore`,
    },
    tasks: {
        list: TASKS,
        mine: `${TASKS}/mine`,
        byId: (id: string) => `${TASKS}/${id}`,
        archive: (id: string) => `${TASKS}/${id}/archive`,
        restore: (id: string) => `${TASKS}/${id}/restore`,
    },
    reports: {
        tasks: `${REPORTS}/tasks`,
        projects: `${REPORTS}/projects`,
    },
    files: {
        byTarget: (kind: 'tasks' | 'projects' | 'comments', id: string) => `${FILES}/${kind}/${id}`,
        byId: (id: string) => `${FILES}/${id}`,
    },
    comments: {
        forTask: (taskId: string) => `${COMMENTS}/tasks/${taskId}`,
        byId: (id: string) => `${COMMENTS}/${id}`,
    },
    notifications: {
        list: NOTIFICATIONS,
        unreadCount: `${NOTIFICATIONS}/unread-count`,
        seen: (id: string) => `${NOTIFICATIONS}/${id}/seen`,
        seenAll: `${NOTIFICATIONS}/seen-all`,
    },
    audit: {
        list: AUDIT,
    },
    workflows: {
        list: WORKFLOWS,
        byId: (id: string) => `${WORKFLOWS}/${id}`,
    },
} as const;

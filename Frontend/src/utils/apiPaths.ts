const AUTH = '/auth';
const USERS = '/users';
const PROJECTS = '/projects';
const TASKS = '/tasks';
const REPORTS = '/reports';
const FILES = '/files';
const COMMENTS = '/comments';

export const API_PATHS = {
    auth: {
        register: `${AUTH}/register`,
        login: `${AUTH}/login`,
        refresh: `${AUTH}/refresh`,
        logout: `${AUTH}/logout`,
        profile: `${AUTH}/profile`,
        profileImage: (value: string) => `${AUTH}/profile/image/${encodeURIComponent(value)}`,
    },
    dashboard: '/dashboard',
    users: {
        list: USERS,
        options: `${USERS}/options`,
        byId: (id: string) => `${USERS}/${id}`,
    },
    projects: {
        list: PROJECTS,
        byId: (id: string) => `${PROJECTS}/${id}`,
    },
    tasks: {
        list: TASKS,
        mine: `${TASKS}/mine`,
        byId: (id: string) => `${TASKS}/${id}`,
    },
    reports: {
        tasks: `${REPORTS}/tasks`,
        projects: `${REPORTS}/projects`,
    },
    files: {
        byTarget: (kind: 'tasks' | 'projects', id: string) => `${FILES}/${kind}/${id}`,
        byId: (id: string) => `${FILES}/${id}`,
    },
    comments: {
        forTask: (taskId: string) => `${COMMENTS}/tasks/${taskId}`,
        byId: (id: string) => `${COMMENTS}/${id}`,
    },
} as const;

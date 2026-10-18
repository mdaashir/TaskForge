const AUTH = '/auth';
const USERS = '/users';
const PROJECTS = '/projects';

export const API_PATHS = {
    auth: {
        register: `${AUTH}/register`,
        login: `${AUTH}/login`,
        refresh: `${AUTH}/refresh`,
        logout: `${AUTH}/logout`,
        profile: `${AUTH}/profile`,
        profileImage: (value: string) => `${AUTH}/profile/image/${encodeURIComponent(value)}`,
    },
    users: {
        list: USERS,
        options: `${USERS}/options`,
        byId: (id: string) => `${USERS}/${id}`,
    },
    projects: {
        list: PROJECTS,
        byId: (id: string) => `${PROJECTS}/${id}`,
    },
} as const;

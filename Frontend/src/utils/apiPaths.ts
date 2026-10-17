const AUTH = '/auth';
const USERS = '/users';

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
        byId: (id: string) => `${USERS}/${id}`,
    },
} as const;

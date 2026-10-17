const AUTH = '/auth';

export const API_PATHS = {
    auth: {
        register: `${AUTH}/register`,
        login: `${AUTH}/login`,
        refresh: `${AUTH}/refresh`,
        logout: `${AUTH}/logout`,
        profile: `${AUTH}/profile`,
        profileImage: (value: string) => `${AUTH}/profile/image/${encodeURIComponent(value)}`,
    },
} as const;

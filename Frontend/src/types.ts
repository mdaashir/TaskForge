export type MemberType = 'ADMIN' | 'VIEWER' | 'USER';

export interface User {
    _id: string;
    name: string;
    email: string;
    profileImageUrl?: string;
    memberType: MemberType;
    roles?: string[];
    state?: string;
    tags?: string[];
}

export interface AuthResponse {
    message: string;
    user: User;
    accessToken: string;
}

export interface UserListResponse {
    users: User[];
    total: number;
    page: number;
    limit: number;
}

export interface UserInput {
    name?: string;
    email?: string;
    password?: string;
    memberType?: MemberType;
    roles?: string[];
    state?: string;
}

export interface PrivateRouteProps {
    allowedRoles: MemberType[];
}

export interface AuthContextValue {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<User>;
    register: (name: string, email: string, password: string) => Promise<User>;
    logout: () => Promise<void>;
}

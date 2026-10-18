export type MemberType = 'ADMIN' | 'VIEWER' | 'USER';

export type ProjectStatus = 'AS' | 'PE' | 'IP' | 'OH' | 'CAN' | 'COM';

export type ProjectPriority = 'High' | 'Med' | 'Low';

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

export interface UserOption {
    _id: string;
    name: string;
    email: string;
    memberType: MemberType;
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

export interface Project {
    _id: string;
    name: string;
    description?: string;
    owner: UserOption | string;
    members?: (UserOption | string)[];
    status: ProjectStatus;
    priority: ProjectPriority;
    startDate?: string;
    endDate?: string;
    progress: number;
    tags?: string[];
    archived?: boolean;
}

export interface ProjectListResponse {
    projects: Project[];
    total: number;
    page: number;
    limit: number;
}

export interface ProjectInput {
    name?: string;
    description?: string;
    owner?: string;
    members?: string[];
    status?: ProjectStatus;
    priority?: ProjectPriority;
    startDate?: string;
    endDate?: string;
    progress?: number;
    tags?: string[];
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

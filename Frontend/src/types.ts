export type MemberType = 'ADMIN' | 'VIEWER' | 'USER';

export type ProjectStatus = 'AS' | 'PE' | 'IP' | 'OH' | 'CAN' | 'COM';

export type ProjectPriority = 'High' | 'Med' | 'Low';

export type TaskStatus = ProjectStatus;

export type TaskPriority = ProjectPriority;

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

export interface ProjectRef {
    _id: string;
    name: string;
    status?: string;
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

export interface TodoItem {
    _id?: string;
    text: string;
    completed: boolean;
}

export interface Task {
    _id: string;
    projectId: ProjectRef | string;
    title: string;
    description?: string;
    priority: TaskPriority;
    status: TaskStatus;
    dueDate?: string;
    assignedTo?: (UserOption | string)[];
    createdBy?: UserOption | string;
    todoChecklist?: TodoItem[];
    progress: number;
    tags?: string[];
    archived?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface TaskListResponse {
    tasks: Task[];
    total: number;
    page: number;
    limit: number;
}

export interface TaskInput {
    projectId?: string;
    title?: string;
    description?: string;
    priority?: TaskPriority;
    status?: TaskStatus;
    dueDate?: string;
    assignedTo?: string[];
    todoChecklist?: { text: string; completed?: boolean }[];
    progress?: number;
    tags?: string[];
}

export interface StatusCount {
    status: string;
    count: number;
}

export interface DashboardResponse {
    scope: 'admin' | 'member';
    totals: {
        users: number | null;
        projects: number;
        tasks: number;
        assignedToMe: number;
        overdue: number;
    };
    tasksByStatus: StatusCount[];
    projectsByStatus: StatusCount[];
    recentTasks: Task[];
}

export interface FileAttachment {
    _id: string;
    name: string;
    originalName: string;
    size: number;
    type: string;
    uploadedBy?: UserOption | string;
    taskId?: string;
    projectId?: string;
    createdAt?: string;
}

export interface TaskComment {
    _id: string;
    text: string;
    createdBy?: UserOption | string;
    parentId?: string;
    replies: TaskComment[];
    createdAt?: string;
    updatedAt?: string;
}

export interface AppNotification {
    _id: string;
    message?: string;
    entity: string;
    targetId?: string;
    priority?: string;
    status?: string;
    readCount: number;
    fromId?: UserOption | string;
    createdAt?: string;
}

export interface AuditEntry {
    _id: string;
    action: string;
    entity: string;
    targetId: string;
    userId?: UserOption | string;
    oldData?: Record<string, unknown> | null;
    newData?: Record<string, unknown> | null;
    createdAt?: string;
}

export interface AuditListResponse {
    entries: AuditEntry[];
    total: number;
    page: number;
    limit: number;
}

export interface WorkflowRef {
    _id: string;
    name: string;
    status?: ProjectStatus;
    progress?: number;
}

export interface Workflow {
    _id: string;
    name: string;
    description?: string;
    parentId?: WorkflowRef | string | null;
    owner: UserOption | string;
    members?: (UserOption | string)[];
    project?: (WorkflowRef | string)[];
    progress: number;
    status: ProjectStatus;
    children?: WorkflowRef[];
    createdAt?: string;
}

export interface WorkflowListResponse {
    workflows: Workflow[];
    total: number;
    page: number;
    limit: number;
}

export interface WorkflowInput {
    name?: string;
    description?: string;
    parentId?: string | null;
    owner?: string;
    members?: string[];
    project?: string[];
    status?: ProjectStatus;
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

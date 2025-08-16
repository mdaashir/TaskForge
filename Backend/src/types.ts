import { Document, Types } from 'mongoose';
import { State, MemberType, Roles, Entity, Priority, Status } from './enums/enums.ts';

type EnumField = {
    value: string;
    name: string;
    description: string;
    display?: string;
};

type EnumType = {
    values: Record<string, string>;
    descriptions: Record<string, string>;
    display: Record<string, string>;
    list: () => string[];
    isValidValue: (value: string) => boolean;
    isValidValueName: (valueName: string) => boolean;
    length: number;
    [key: string]:
        | string
        | Record<string, string>
        | ((value: string) => string[] | boolean)
        | number;
};

interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    profileImageUrl?: string;
    memberType: typeof MemberType;
    roles?: (typeof Roles)[];
    state: typeof State;
    archived?: boolean;
    archivedAt?: Date;
    archivedBy?: Types.ObjectId;
    lastLogin?: Date;
    isSynced?: boolean;
    syncedAt?: Date;
    syncedBy?: Types.ObjectId;
    tags?: string[];
    createdBy: Types.ObjectId;
    updatedBy?: Types.ObjectId;
}

interface ITodo extends Document {
    text: string;
    completed: boolean;
    createdBy: Types.ObjectId;
    updatedBy?: Types.ObjectId;
    tags?: string[];
}

interface ITask extends Document {
    projectId: Types.ObjectId;
    title: string;
    description?: string;
    priority: typeof Priority;
    status: typeof Status;
    dueDate?: Date;
    assignedTo?: Types.ObjectId[];
    createdBy: Types.ObjectId;
    updatedBy?: Types.ObjectId;
    archived?: boolean;
    archivedAt?: Date;
    archivedBy?: Types.ObjectId;
    attachments?: Types.ObjectId[];
    comments?: Types.ObjectId[];
    todoChecklist?: ITodo[];
    progress: number;
    tags?: string[];
}

interface IProject extends Document {
    name: string;
    description?: string;
    owner: Types.ObjectId;
    members?: Types.ObjectId[];
    tasks?: Types.ObjectId[];
    status: typeof Status;
    startDate: Date;
    endDate?: Date;
    progress: number;
    attachments?: Types.ObjectId[];
    comments?: Types.ObjectId[];
    tags?: string[];
    priority: typeof Priority;
    createdBy: Types.ObjectId;
    updatedBy?: Types.ObjectId;
    archived?: boolean;
    archivedAt?: Date;
    archivedBy?: Types.ObjectId;
}

interface IComment extends Document {
    projectId: Types.ObjectId;
    taskId: Types.ObjectId;
    parentId?: Types.ObjectId;
    text: string;
    childrenId?: Types.ObjectId[];
    attachments?: Types.ObjectId[];
    tags?: string[];
    createdBy: Types.ObjectId;
    updatedBy?: Types.ObjectId;
}

interface IFile extends Document {
    name: string;
    originalName: string;
    url: string;
    size: number;
    type: string;
    description?: string;
    tags?: string[];
    uploadedBy: Types.ObjectId;
    projectId?: Types.ObjectId;
    taskId?: Types.ObjectId;
    commentId?: Types.ObjectId;
    meetingId?: Types.ObjectId;
    issueId?: Types.ObjectId;
}

interface IAuditLog extends Document {
    userId: Types.ObjectId;
    action: string;
    entity: typeof Entity;
    targetId: Types.ObjectId;
    newData?: object;
    oldData?: object;
    achievedId?: Types.ObjectId;
    updatedId?: Types.ObjectId;
    deletedId?: Types.ObjectId;
}

interface IWorkFlow extends Document {
    parentId?: Types.ObjectId;
    name: string;
    description?: string;
    owner: Types.ObjectId;
    members?: Types.ObjectId[];
    project?: Types.ObjectId[];
    progress: number;
    status: typeof Status;
    createdBy: Types.ObjectId;
    updatedBy?: Types.ObjectId;
    children?: Types.ObjectId[];
}

interface INotification extends Document {
    fromId: Types.ObjectId;
    toId: Types.ObjectId;
    entity: typeof Entity;
    message?: string;
    status?: typeof Status;
    priority?: typeof Priority;
    read?: IRead[];
    readCount?: number;
}

interface IRead extends Document {
    userId: Types.ObjectId;
    received: boolean;
    receivedAt: Date;
    seen: boolean;
    seenAt: Date;
}

export {
    EnumField,
    EnumType,
    IUser,
    ITodo,
    ITask,
    IProject,
    IComment,
    IFile,
    IAuditLog,
    IWorkFlow,
    INotification,
    IRead,
};

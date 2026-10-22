import { MemberType } from '../enums/enums.ts';
import type { IProject, IUser } from '../types.ts';

export const idOf = (value: unknown): string => {
    if (value && typeof value === 'object' && '_id' in value) {
        return String((value as { _id: unknown })._id);
    }
    return String(value);
};

export const isAdmin = (actor: IUser) => actor.memberType === MemberType.Admin;

const isProjectOwner = (project: IProject, actor: IUser) =>
    idOf(project.owner) === idOf(actor._id);

const isProjectMember = (project: IProject, actor: IUser) =>
    (project.members ?? []).some((member) => idOf(member) === idOf(actor._id));

export const canViewProject = (project: IProject, actor: IUser) =>
    isAdmin(actor) || isProjectOwner(project, actor) || isProjectMember(project, actor);

export const canDeleteProject = (project: IProject, actor: IUser) =>
    isAdmin(actor) || isProjectOwner(project, actor);

import { Types, type FilterQuery } from 'mongoose';
import projectModel from '../models/Project.ts';
import type { IProject, IUser } from '../types.ts';
import { canDeleteProject, canViewProject, isAdmin } from '../utils/access.ts';

const PEOPLE = 'name email memberType';

const accessDenied = () => ({ message: 'Access denied.', forbidden: true as const });
const notFound = () => ({ message: 'Project not found.' });
const invalidId = () => ({ message: 'Invalid project ID.' });

async function visibleIds(actor: IUser) {
    const projects = await projectModel
        .find({ $or: [{ owner: actor._id }, { members: actor._id }] })
        .select('_id');
    return projects.map((project) => project._id as Types.ObjectId);
}

interface ProjectQuery {
    search?: string;
    status?: string;
}

function buildFilter(actor: IUser, options: ProjectQuery = {}): FilterQuery<IProject> {
    const conditions: FilterQuery<IProject>[] = [{ archived: { $ne: true } }];
    if (!isAdmin(actor)) {
        conditions.push({ $or: [{ owner: actor._id }, { members: actor._id }] });
    }
    if (options.search) {
        const escaped = options.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp(escaped, 'i');
        conditions.push({ $or: [{ name: pattern }, { description: pattern }] });
    }
    if (options.status) conditions.push({ status: options.status });

    return conditions.length === 1 ? conditions[0] : { $and: conditions };
}

async function getAll(
    actor: IUser,
    options: ProjectQuery & { page?: number; limit?: number } = {}
) {
    try {
        const page = Math.max(1, options.page ?? 1);
        const limit = Math.min(100, Math.max(1, options.limit ?? 20));
        const filter = buildFilter(actor, options);

        const [projects, total] = await Promise.all([
            projectModel
                .find(filter)
                .populate('owner', PEOPLE)
                .populate('members', PEOPLE)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            projectModel.countDocuments(filter),
        ]);

        return { projects, total, page, limit };
    } catch (error) {
        return error instanceof Error
            ? { message: 'Error fetching projects', error: error.message }
            : { message: 'An unknown error occurred while fetching projects.' };
    }
}

async function getOne(projectId: Types.ObjectId, actor: IUser) {
    try {
        if (!Types.ObjectId.isValid(projectId)) return invalidId();
        const project = await projectModel
            .findById(projectId)
            .populate('owner', PEOPLE)
            .populate('members', PEOPLE);
        if (!project) return notFound();
        if (!canViewProject(project, actor)) return accessDenied();
        return { project };
    } catch (error) {
        return error instanceof Error
            ? { message: 'Error fetching project', error: error.message }
            : { message: 'An unknown error occurred while fetching the project.' };
    }
}

async function create(data: Partial<IProject>, actor: IUser) {
    try {
        const payload: Partial<IProject> = { ...data };
        if (!isAdmin(actor) || !payload.owner) payload.owner = actor._id as Types.ObjectId;
        payload.createdBy = actor._id as Types.ObjectId;

        const project = new projectModel(payload);
        await project.validate();
        const result = await project.save();
        return { project: result };
    } catch (error) {
        return error instanceof Error
            ? { message: 'Invalid project data', error: error.message }
            : { message: 'An unknown error occurred while creating the project.' };
    }
}

async function update(projectId: Types.ObjectId, data: Partial<IProject>, actor: IUser) {
    try {
        if (!Types.ObjectId.isValid(projectId)) return invalidId();
        const project = await projectModel.findById(projectId);
        if (!project) return notFound();
        if (!canViewProject(project, actor)) return accessDenied();

        const patch: Partial<IProject> = { ...data };
        if (!isAdmin(actor)) delete patch.owner;

        Object.assign(project, patch);
        project.updatedBy = actor._id as Types.ObjectId;
        await project.validate();
        const result = await project.save();
        return { project: result };
    } catch (error) {
        return error instanceof Error
            ? { message: 'Invalid project data', error: error.message }
            : { message: 'An unknown error occurred while updating the project.' };
    }
}

async function remove(projectId: Types.ObjectId, actor: IUser) {
    try {
        if (!Types.ObjectId.isValid(projectId)) return invalidId();
        const project = await projectModel.findById(projectId);
        if (!project) return notFound();
        if (!canDeleteProject(project, actor)) return accessDenied();

        await project.deleteOne();
        return { success: true as const };
    } catch (error) {
        return error instanceof Error
            ? { message: 'Error deleting project', error: error.message }
            : { message: 'An unknown error occurred while deleting the project.' };
    }
}

export default { getAll, buildFilter, visibleIds, getOne, create, update, remove };

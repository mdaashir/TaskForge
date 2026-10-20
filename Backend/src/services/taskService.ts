import { Types, type FilterQuery } from 'mongoose';
import projectModel from '../models/Project.ts';
import taskModel from '../models/Task.ts';
import type { ITask, IUser } from '../types.ts';
import { canViewProject, idOf, isAdmin } from '../utils/access.ts';
import projectService from './projectService.ts';

const TASK_PEOPLE = 'name email';

const accessDenied = () => ({ message: 'Access denied.', forbidden: true as const });
const notFound = () => ({ message: 'Task not found.' });
const invalidId = () => ({ message: 'Invalid task ID.' });

const isCreator = (task: ITask, actor: IUser) => idOf(task.createdBy) === idOf(actor._id);
const canModify = (task: ITask, actor: IUser) => isAdmin(actor) || isCreator(task, actor);

const withPeople = () =>
    taskModel
        .find()
        .populate('projectId', 'name status')
        .populate('assignedTo', TASK_PEOPLE)
        .sort({ createdAt: -1 });

interface TaskQuery {
    search?: string;
    projectId?: string;
    status?: string;
    assignedTo?: string;
}

async function buildFilter(actor: IUser, options: TaskQuery = {}): Promise<FilterQuery<ITask>> {
    const conditions: FilterQuery<ITask>[] = [{ archived: { $ne: true } }];
    if (!isAdmin(actor)) {
        conditions.push({ projectId: { $in: await projectService.visibleIds(actor) } });
    }
    if (options.projectId) conditions.push({ projectId: options.projectId });
    if (options.status) conditions.push({ status: options.status });
    if (options.assignedTo) conditions.push({ assignedTo: options.assignedTo });
    if (options.search) {
        const escaped = options.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp(escaped, 'i');
        conditions.push({ $or: [{ title: pattern }, { description: pattern }] });
    }

    return conditions.length === 1 ? conditions[0] : { $and: conditions };
}

async function getAll(
    actor: IUser,
    options: TaskQuery & { page?: number; limit?: number } = {}
) {
    try {
        const page = Math.max(1, options.page ?? 1);
        const limit = Math.min(100, Math.max(1, options.limit ?? 20));
        const filter = await buildFilter(actor, options);

        const [tasks, total] = await Promise.all([
            withPeople().where(filter).skip((page - 1) * limit).limit(limit),
            taskModel.countDocuments(filter),
        ]);

        return { tasks, total, page, limit };
    } catch (error) {
        return error instanceof Error
            ? { message: 'Error fetching tasks', error: error.message }
            : { message: 'An unknown error occurred while fetching tasks.' };
    }
}

async function getMine(actor: IUser, options: { page?: number; limit?: number } = {}) {
    try {
        const page = Math.max(1, options.page ?? 1);
        const limit = Math.min(100, Math.max(1, options.limit ?? 20));
        const filter: FilterQuery<ITask> = { archived: { $ne: true }, assignedTo: actor._id };

        const [tasks, total] = await Promise.all([
            withPeople().where(filter).skip((page - 1) * limit).limit(limit),
            taskModel.countDocuments(filter),
        ]);

        return { tasks, total, page, limit };
    } catch (error) {
        return error instanceof Error
            ? { message: 'Error fetching tasks', error: error.message }
            : { message: 'An unknown error occurred while fetching tasks.' };
    }
}

async function getOne(taskId: Types.ObjectId, actor: IUser) {
    try {
        if (!Types.ObjectId.isValid(taskId)) return invalidId();
        const task = await taskModel.findById(taskId);
        if (!task) return notFound();

        const project = await projectModel.findById(task.projectId);
        if (!project) return notFound();
        if (!canViewProject(project, actor)) return accessDenied();

        await task.populate([
            { path: 'projectId', select: 'name status' },
            { path: 'assignedTo', select: TASK_PEOPLE },
        ]);
        return { task };
    } catch (error) {
        return error instanceof Error
            ? { message: 'Error fetching task', error: error.message }
            : { message: 'An unknown error occurred while fetching the task.' };
    }
}

async function create(data: Partial<ITask>, actor: IUser) {
    try {
        const project = await projectModel.findById(data.projectId);
        if (!project) return { message: 'Project not found.' };
        if (!canViewProject(project, actor)) return accessDenied();

        const payload: Partial<ITask> = { ...data };
        payload.createdBy = actor._id as Types.ObjectId;
        if (payload.todoChecklist?.length) {
            payload.todoChecklist = payload.todoChecklist.map((item) => ({
                ...item,
                createdBy: item.createdBy ?? (actor._id as Types.ObjectId),
            }));
        }

        const task = new taskModel(payload);
        await task.validate();
        const result = await task.save();

        await projectModel.updateOne({ _id: project._id }, { $push: { tasks: result._id } });
        return { task: result };
    } catch (error) {
        return error instanceof Error
            ? { message: 'Invalid task data', error: error.message }
            : { message: 'An unknown error occurred while creating the task.' };
    }
}

async function update(taskId: Types.ObjectId, data: Partial<ITask>, actor: IUser) {
    try {
        if (!Types.ObjectId.isValid(taskId)) return invalidId();
        const task = await taskModel.findById(taskId);
        if (!task) return notFound();
        if (!canModify(task, actor)) return accessDenied();

        const patch: Partial<ITask> = { ...data };
        if (patch.todoChecklist?.length) {
            patch.todoChecklist = patch.todoChecklist.map((item) => ({
                ...item,
                createdBy: item.createdBy ?? (actor._id as Types.ObjectId),
            }));
        }

        Object.assign(task, patch);
        task.updatedBy = actor._id as Types.ObjectId;
        await task.validate();
        const result = await task.save();
        return { task: result };
    } catch (error) {
        return error instanceof Error
            ? { message: 'Invalid task data', error: error.message }
            : { message: 'An unknown error occurred while updating the task.' };
    }
}

async function remove(taskId: Types.ObjectId, actor: IUser) {
    try {
        if (!Types.ObjectId.isValid(taskId)) return invalidId();
        const task = await taskModel.findById(taskId);
        if (!task) return notFound();
        if (!canModify(task, actor)) return accessDenied();

        const projectId = task.projectId;
        const taskDocId = task._id;
        await task.deleteOne();
        await projectModel.updateOne({ _id: projectId }, { $pull: { tasks: taskDocId } });
        return { success: true as const };
    } catch (error) {
        return error instanceof Error
            ? { message: 'Error deleting task', error: error.message }
            : { message: 'An unknown error occurred while deleting the task.' };
    }
}

export default { getAll, buildFilter, getMine, getOne, create, update, remove };

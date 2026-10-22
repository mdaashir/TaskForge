import { Types, type FilterQuery } from 'mongoose';
import { Actions, Entity, Priority, Status } from '../enums/enums.ts';
import projectModel from '../models/Project.ts';
import taskModel from '../models/Task.ts';
import type { ITask, IUser } from '../types.ts';
import { canViewProject, idOf, isAdmin } from '../utils/access.ts';
import auditService from './auditService.ts';
import notificationService from './notificationService.ts';
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

type ArchivedView = 'active' | 'archived' | 'all';

interface TaskQuery {
    search?: string;
    projectId?: string;
    status?: string;
    assignedTo?: string;
    archived?: ArchivedView;
}

async function buildFilter(actor: IUser, options: TaskQuery = {}): Promise<FilterQuery<ITask>> {
    const includeArchivedProjects =
        options.archived === 'archived' || options.archived === 'all';
    const conditions: FilterQuery<ITask>[] = [];

    if (options.archived === 'archived') conditions.push({ archived: true });
    else if (options.archived !== 'all') conditions.push({ archived: { $ne: true } });

    if (!isAdmin(actor)) {
        conditions.push({
            projectId: {
                $in: await projectService.visibleIds(actor, {
                    includeArchived: includeArchivedProjects,
                }),
            },
        });
    } else if (!includeArchivedProjects) {
        conditions.push({ projectId: { $nin: await projectService.archivedIds() } });
    }

    if (options.projectId) conditions.push({ projectId: options.projectId });
    if (options.status) conditions.push({ status: options.status });
    if (options.assignedTo) conditions.push({ assignedTo: options.assignedTo });
    if (options.search) {
        const escaped = options.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp(escaped, 'i');
        conditions.push({ $or: [{ title: pattern }, { description: pattern }] });
    }

    if (conditions.length === 0) return {};
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

async function getMine(
    actor: IUser,
    options: { page?: number; limit?: number; archived?: ArchivedView } = {}
) {
    try {
        const page = Math.max(1, options.page ?? 1);
        const limit = Math.min(100, Math.max(1, options.limit ?? 20));
        const filter = await buildFilter(actor, {
            archived: options.archived,
            assignedTo: String(actor._id),
        });

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

        await notificationService.notifyUsers(actor, result.assignedTo ?? [], {
            entity: String(Entity.Task),
            message: `${actor.name} assigned you to "${result.title}"`,
            targetId: result._id as Types.ObjectId,
            priority: String(Priority.Medium),
        });

        await auditService.record({
            actor,
            action: String(Actions.Create),
            entity: String(Entity.Task),
            targetId: result._id as Types.ObjectId,
            newData: result,
        });

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

        const before = task.toObject();
        const previousStatus = task.status;
        Object.assign(task, patch);
        task.updatedBy = actor._id as Types.ObjectId;
        await task.validate();
        const result = await task.save();

        if (result.status !== previousStatus) {
            await notificationService.notifyUsers(
                actor,
                [result.createdBy, ...(result.assignedTo ?? [])],
                {
                    entity: String(Entity.Task),
                    message: `${actor.name} changed "${result.title}" to ${
                        Status.descriptions[result.status] ?? result.status
                    }`,
                    targetId: result._id as Types.ObjectId,
                    status: result.status,
                }
            );
        }

        const { oldData, newData } = auditService.diff(before, result);
        if (oldData || newData) {
            await auditService.record({
                actor,
                action: String(Actions.Update),
                entity: String(Entity.Task),
                targetId: result._id as Types.ObjectId,
                oldData,
                newData,
            });
        }

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
        const before = task.toObject();
        await task.deleteOne();
        await projectModel.updateOne({ _id: projectId }, { $pull: { tasks: taskDocId } });

        await auditService.record({
            actor,
            action: String(Actions.Delete),
            entity: String(Entity.Task),
            targetId: taskDocId as Types.ObjectId,
            oldData: before,
        });

        return { success: true as const };
    } catch (error) {
        return error instanceof Error
            ? { message: 'Error deleting task', error: error.message }
            : { message: 'An unknown error occurred while deleting the task.' };
    }
}

async function setArchived(taskId: Types.ObjectId, actor: IUser, archived: boolean) {
    try {
        if (!Types.ObjectId.isValid(taskId)) return invalidId();
        const task = await taskModel.findById(taskId);
        if (!task) return notFound();
        if (!canModify(task, actor)) return accessDenied();

        if (Boolean(task.archived) === archived) return { task };

        task.archived = archived;
        if (archived) {
            task.archivedAt = new Date();
            task.archivedBy = actor._id as Types.ObjectId;
        } else {
            task.archivedAt = undefined;
            task.archivedBy = undefined;
        }
        task.updatedBy = actor._id as Types.ObjectId;

        const result = await task.save();

        await auditService.record({
            actor,
            action: String(archived ? Actions.Archive : Actions.Restore),
            entity: String(Entity.Task),
            targetId: result._id as Types.ObjectId,
            oldData: { archived: !archived },
            newData: { archived },
        });

        return { task: result };
    } catch (error) {
        return error instanceof Error
            ? {
                  message: `Error ${archived ? 'archiving' : 'restoring'} task`,
                  error: error.message,
              }
            : {
                  message: `An unknown error occurred while ${
                      archived ? 'archiving' : 'restoring'
                  } the task.`,
              };
    }
}

const archive = (taskId: Types.ObjectId, actor: IUser) => setArchived(taskId, actor, true);
const restore = (taskId: Types.ObjectId, actor: IUser) => setArchived(taskId, actor, false);

export default {
    getAll,
    buildFilter,
    getMine,
    getOne,
    create,
    update,
    archive,
    restore,
    remove,
};

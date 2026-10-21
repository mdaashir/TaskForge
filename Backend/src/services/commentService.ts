import { Types, type HydratedDocument } from 'mongoose';
import { Actions, Entity, Priority } from '../enums/enums.ts';
import commentModel from '../models/Comment.ts';
import projectModel from '../models/Project.ts';
import taskModel from '../models/Task.ts';
import type { IComment, IProject, ITask, IUser } from '../types.ts';
import { canViewProject, idOf, isAdmin } from '../utils/access.ts';
import auditService from './auditService.ts';
import notificationService from './notificationService.ts';

type CommentView = Record<string, unknown> & { replies: CommentView[] };

type Failure = {
    ok: false;
    message: string;
    error?: string;
    forbidden?: boolean;
    invalid?: boolean;
};

type Loaded = { ok: true; task: HydratedDocument<ITask>; project: HydratedDocument<IProject> };
type Modified = { ok: true; comment: HydratedDocument<IComment> };

const accessDenied = (): Failure => ({ ok: false, message: 'Access denied.', forbidden: true });
const notFound = (label: string): Failure => ({ ok: false, message: `${label} not found.` });
const invalid = (message: string): Failure => ({ ok: false, message, invalid: true });

const failed = (error: unknown, message: string): Failure => ({
    ok: false,
    message,
    error: error instanceof Error ? error.message : String(error),
});

async function taskAndProject(taskId: string): Promise<Loaded | Failure> {
    if (!Types.ObjectId.isValid(taskId)) return invalid('Invalid task ID.');
    const task = await taskModel.findById(taskId);
    if (!task) return notFound('Task');
    const project = await projectModel.findById(task.projectId);
    if (!project) return notFound('Project');
    return { ok: true, task, project };
}

async function listForTask(taskId: string, actor: IUser) {
    try {
        const loaded = await taskAndProject(taskId);
        if (!loaded.ok) return loaded;
        if (!canViewProject(loaded.project, actor)) return accessDenied();

        const comments = await commentModel
            .find({ taskId: loaded.task._id })
            .populate('createdBy', 'name email')
            .sort({ createdAt: 1 });

        const nodes = new Map<string, CommentView>();
        const roots: CommentView[] = [];

        for (const comment of comments) {
            const node = { ...comment.toObject(), replies: [] } as CommentView;
            nodes.set(String(comment._id), node);
        }

        for (const comment of comments) {
            const node = nodes.get(String(comment._id));
            if (!node) continue;
            const parent = comment.parentId ? nodes.get(String(comment.parentId)) : undefined;
            if (parent) parent.replies.push(node);
            else roots.push(node);
        }

        return { ok: true as const, comments: roots };
    } catch (error) {
        return failed(error, 'Error fetching comments');
    }
}

async function create(taskId: string, data: { text: string; parentId?: string }, actor: IUser) {
    try {
        const loaded = await taskAndProject(taskId);
        if (!loaded.ok) return loaded;
        if (!canViewProject(loaded.project, actor)) return accessDenied();

        let parentId: Types.ObjectId | undefined;
        if (data.parentId) {
            if (!Types.ObjectId.isValid(data.parentId)) return invalid('Invalid parent comment ID.');
            const parent = await commentModel.findById(data.parentId);
            if (!parent || String(parent.taskId) !== String(loaded.task._id)) {
                return invalid('Parent comment not found.');
            }
            if (parent.parentId) return invalid('Replies are only one level deep.');
            parentId = parent._id as Types.ObjectId;
        }

        const comment = await commentModel.create({
            projectId: loaded.project._id,
            taskId: loaded.task._id,
            parentId,
            text: data.text,
            createdBy: actor._id as Types.ObjectId,
        });

        await taskModel.updateOne({ _id: loaded.task._id }, { $push: { comments: comment._id } });
        if (parentId) {
            await commentModel.updateOne(
                { _id: parentId },
                { $push: { childrenId: comment._id } }
            );
        }

        await notificationService.notifyUsers(
            actor,
            [loaded.task.createdBy, ...(loaded.task.assignedTo ?? [])],
            {
                entity: String(Entity.Task),
                message: `${actor.name} commented on "${loaded.task.title}"`,
                targetId: loaded.task._id as Types.ObjectId,
                priority: String(Priority.Medium),
            }
        );

        await auditService.record({
            actor,
            action: String(Actions.Create),
            entity: String(Entity.Comment),
            targetId: comment._id as Types.ObjectId,
            newData: comment,
        });

        return { ok: true as const, comment };
    } catch (error) {
        return failed(error, 'Invalid comment data');
    }
}

async function canModify(commentId: string, actor: IUser): Promise<Modified | Failure> {
    if (!Types.ObjectId.isValid(commentId)) return invalid('Invalid comment ID.');
    const comment = await commentModel.findById(commentId);
    if (!comment) return notFound('Comment');
    if (!isAdmin(actor) && idOf(comment.createdBy) !== idOf(actor._id)) return accessDenied();
    return { ok: true, comment };
}

async function update(commentId: string, text: string, actor: IUser) {
    try {
        const loaded = await canModify(commentId, actor);
        if (!loaded.ok) return loaded;

        const before = loaded.comment.toObject();
        loaded.comment.text = text;
        loaded.comment.updatedBy = actor._id as Types.ObjectId;
        await loaded.comment.save();

        const { oldData, newData } = auditService.diff(before, loaded.comment);
        if (oldData || newData) {
            await auditService.record({
                actor,
                action: String(Actions.Update),
                entity: String(Entity.Comment),
                targetId: loaded.comment._id as Types.ObjectId,
                oldData,
                newData,
            });
        }

        return { ok: true as const, comment: loaded.comment };
    } catch (error) {
        return failed(error, 'Invalid comment data');
    }
}

async function remove(commentId: string, actor: IUser) {
    try {
        const loaded = await canModify(commentId, actor);
        if (!loaded.ok) return loaded;

        const comment: IComment = loaded.comment;
        const ids = [comment._id as Types.ObjectId, ...(comment.childrenId ?? [])];
        const before = comment.toObject();

        await commentModel.deleteMany({ _id: { $in: ids } });
        await taskModel.updateOne(
            { _id: comment.taskId },
            { $pull: { comments: { $in: ids } } }
        );
        if (comment.parentId) {
            await commentModel.updateOne(
                { _id: comment.parentId },
                { $pull: { childrenId: comment._id } }
            );
        }

        await auditService.record({
            actor,
            action: String(Actions.Delete),
            entity: String(Entity.Comment),
            targetId: comment._id as Types.ObjectId,
            oldData: before,
        });

        return { ok: true as const };
    } catch (error) {
        return failed(error, 'Error deleting comment');
    }
}

export default { listForTask, create, update, remove };

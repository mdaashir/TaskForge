import type { RequestWithUser } from '../types.ts';
import type { Response } from 'express';
import { Types } from 'mongoose';
import taskService from '../services/taskService.ts';

const problemStatus = (result: object) =>
    'error' in result ? 500 : 'forbidden' in result ? 403 : 404;

const invalidId = (res: Response) => res.status(400).json({ message: 'Invalid task id' });

const queryString = (value: unknown) => (typeof value === 'string' ? value : undefined);

const archivedView = (value: unknown): 'active' | 'archived' | 'all' | undefined =>
    value === 'active' || value === 'archived' || value === 'all' ? value : undefined;

async function listTasks(req: RequestWithUser, res: Response) {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authorized' });

        const result = await taskService.getAll(req.user, {
            page: Number(req.query.page) || 1,
            limit: Number(req.query.limit) || 20,
            search: queryString(req.query.search),
            projectId: queryString(req.query.projectId),
            status: queryString(req.query.status),
            assignedTo: queryString(req.query.assignedTo),
            archived: archivedView(req.query.archived),
        });
        if ('message' in result) {
            return res.status(problemStatus(result)).json({ message: String(result.message) });
        }

        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

async function listMyTasks(req: RequestWithUser, res: Response) {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authorized' });

        const result = await taskService.getMine(req.user, {
            page: Number(req.query.page) || 1,
            limit: Number(req.query.limit) || 20,
            archived: archivedView(req.query.archived),
        });
        if ('message' in result) {
            return res.status(problemStatus(result)).json({ message: String(result.message) });
        }

        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

async function getTaskById(req: RequestWithUser, res: Response) {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authorized' });
        if (!Types.ObjectId.isValid(req.params.id)) return invalidId(res);

        const result = await taskService.getOne(new Types.ObjectId(req.params.id), req.user);
        if ('message' in result) {
            return res.status(problemStatus(result)).json({ message: String(result.message) });
        }

        return res.status(200).json({ task: result.task });
    } catch (error) {
        return res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

async function createTask(req: RequestWithUser, res: Response) {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authorized' });

        const result = await taskService.create(req.body.task, req.user);
        if ('message' in result) {
            return res.status(problemStatus(result)).json({ message: String(result.message) });
        }

        return res.status(201).json({ message: 'Task created successfully.', task: result.task });
    } catch (error) {
        return res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

async function updateTask(req: RequestWithUser, res: Response) {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authorized' });
        if (!Types.ObjectId.isValid(req.params.id)) return invalidId(res);

        const result = await taskService.update(
            new Types.ObjectId(req.params.id),
            req.body.task,
            req.user
        );
        if ('message' in result) {
            return res.status(problemStatus(result)).json({ message: String(result.message) });
        }

        return res.status(200).json({ message: 'Task updated successfully.', task: result.task });
    } catch (error) {
        return res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

async function deleteTask(req: RequestWithUser, res: Response) {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authorized' });
        if (!Types.ObjectId.isValid(req.params.id)) return invalidId(res);

        const result = await taskService.remove(new Types.ObjectId(req.params.id), req.user);
        if ('message' in result) {
            return res.status(problemStatus(result)).json({ message: String(result.message) });
        }

        return res.status(200).json({ message: 'Task deleted successfully.' });
    } catch (error) {
        return res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

async function archiveTask(req: RequestWithUser, res: Response) {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authorized' });
        if (!Types.ObjectId.isValid(req.params.id)) return invalidId(res);

        const result = await taskService.archive(new Types.ObjectId(req.params.id), req.user);
        if ('message' in result) {
            return res.status(problemStatus(result)).json({ message: String(result.message) });
        }

        return res.status(200).json({ message: 'Task archived successfully.', task: result.task });
    } catch (error) {
        return res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

async function restoreTask(req: RequestWithUser, res: Response) {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authorized' });
        if (!Types.ObjectId.isValid(req.params.id)) return invalidId(res);

        const result = await taskService.restore(new Types.ObjectId(req.params.id), req.user);
        if ('message' in result) {
            return res.status(problemStatus(result)).json({ message: String(result.message) });
        }

        return res.status(200).json({ message: 'Task restored successfully.', task: result.task });
    } catch (error) {
        return res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

export default {
    listTasks,
    listMyTasks,
    getTaskById,
    createTask,
    updateTask,
    archiveTask,
    restoreTask,
    deleteTask,
};

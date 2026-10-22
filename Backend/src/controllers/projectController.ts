import type { RequestWithUser } from '../types.ts';
import type { Response } from 'express';
import { Types } from 'mongoose';
import projectService from '../services/projectService.ts';

const problemStatus = (result: object) =>
    'error' in result ? 500 : 'forbidden' in result ? 403 : 404;

const invalidId = (res: Response) => res.status(400).json({ message: 'Invalid project id' });

const archivedView = (value: unknown): 'active' | 'archived' | 'all' | undefined =>
    value === 'active' || value === 'archived' || value === 'all' ? value : undefined;

async function listProjects(req: RequestWithUser, res: Response) {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authorized' });

        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;
        const search = typeof req.query.search === 'string' ? req.query.search : undefined;
        const status = typeof req.query.status === 'string' ? req.query.status : undefined;

        const result = await projectService.getAll(req.user, {
            page,
            limit,
            search,
            status,
            archived: archivedView(req.query.archived),
        });
        if ('message' in result) {
            const code = problemStatus(result);
            return res.status(code).json({ message: String(result.message) });
        }

        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

async function getProjectById(req: RequestWithUser, res: Response) {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authorized' });
        if (!Types.ObjectId.isValid(req.params.id)) return invalidId(res);

        const result = await projectService.getOne(new Types.ObjectId(req.params.id), req.user);
        if ('message' in result) {
            return res.status(problemStatus(result)).json({ message: String(result.message) });
        }

        return res.status(200).json({ project: result.project });
    } catch (error) {
        return res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

async function createProject(req: RequestWithUser, res: Response) {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authorized' });

        const result = await projectService.create(req.body.project, req.user);
        if ('message' in result) {
            return res.status(problemStatus(result)).json({ message: String(result.message) });
        }

        return res
            .status(201)
            .json({ message: 'Project created successfully.', project: result.project });
    } catch (error) {
        return res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

async function updateProject(req: RequestWithUser, res: Response) {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authorized' });
        if (!Types.ObjectId.isValid(req.params.id)) return invalidId(res);

        const result = await projectService.update(
            new Types.ObjectId(req.params.id),
            req.body.project,
            req.user
        );
        if ('message' in result) {
            return res.status(problemStatus(result)).json({ message: String(result.message) });
        }

        return res
            .status(200)
            .json({ message: 'Project updated successfully.', project: result.project });
    } catch (error) {
        return res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

async function deleteProject(req: RequestWithUser, res: Response) {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authorized' });
        if (!Types.ObjectId.isValid(req.params.id)) return invalidId(res);

        const result = await projectService.remove(new Types.ObjectId(req.params.id), req.user);
        if ('message' in result) {
            return res.status(problemStatus(result)).json({ message: String(result.message) });
        }

        return res.status(200).json({ message: 'Project deleted successfully.' });
    } catch (error) {
        return res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

async function archiveProject(req: RequestWithUser, res: Response) {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authorized' });
        if (!Types.ObjectId.isValid(req.params.id)) return invalidId(res);

        const result = await projectService.archive(
            new Types.ObjectId(req.params.id),
            req.user
        );
        if ('message' in result) {
            return res.status(problemStatus(result)).json({ message: String(result.message) });
        }

        return res
            .status(200)
            .json({ message: 'Project archived successfully.', project: result.project });
    } catch (error) {
        return res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

async function restoreProject(req: RequestWithUser, res: Response) {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authorized' });
        if (!Types.ObjectId.isValid(req.params.id)) return invalidId(res);

        const result = await projectService.restore(
            new Types.ObjectId(req.params.id),
            req.user
        );
        if ('message' in result) {
            return res.status(problemStatus(result)).json({ message: String(result.message) });
        }

        return res
            .status(200)
            .json({ message: 'Project restored successfully.', project: result.project });
    } catch (error) {
        return res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

export default {
    listProjects,
    getProjectById,
    createProject,
    updateProject,
    archiveProject,
    restoreProject,
    deleteProject,
};

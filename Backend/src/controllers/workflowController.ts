import type { RequestWithUser } from '../types.ts';
import type { Response } from 'express';
import { Types } from 'mongoose';
import workflowService from '../services/workflowService.ts';

const problemStatus = (result: object) =>
    'error' in result ? 500 : 'forbidden' in result ? 403 : 'invalid' in result ? 400 : 404;

const invalidId = (res: Response) => res.status(400).json({ message: 'Invalid workflow id' });

async function listWorkflows(req: RequestWithUser, res: Response) {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authorized' });

        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;
        const search = typeof req.query.search === 'string' ? req.query.search : undefined;
        const status = typeof req.query.status === 'string' ? req.query.status : undefined;
        const parentId =
            typeof req.query.parentId === 'string' ? req.query.parentId : undefined;

        const result = await workflowService.getAll(req.user, {
            page,
            limit,
            search,
            status,
            parentId,
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

async function getWorkflowById(req: RequestWithUser, res: Response) {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authorized' });
        if (!Types.ObjectId.isValid(req.params.id)) return invalidId(res);

        const result = await workflowService.getOne(
            new Types.ObjectId(req.params.id),
            req.user
        );
        if ('message' in result) {
            return res.status(problemStatus(result)).json({ message: String(result.message) });
        }

        return res.status(200).json({ workflow: result.workflow });
    } catch (error) {
        return res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

async function createWorkflow(req: RequestWithUser, res: Response) {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authorized' });

        const result = await workflowService.create(req.body.workflow, req.user);
        if ('message' in result) {
            return res.status(problemStatus(result)).json({ message: String(result.message) });
        }

        return res
            .status(201)
            .json({ message: 'Workflow created successfully.', workflow: result.workflow });
    } catch (error) {
        return res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

async function updateWorkflow(req: RequestWithUser, res: Response) {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authorized' });
        if (!Types.ObjectId.isValid(req.params.id)) return invalidId(res);

        const result = await workflowService.update(
            new Types.ObjectId(req.params.id),
            req.body.workflow,
            req.user
        );
        if ('message' in result) {
            return res.status(problemStatus(result)).json({ message: String(result.message) });
        }

        return res
            .status(200)
            .json({ message: 'Workflow updated successfully.', workflow: result.workflow });
    } catch (error) {
        return res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

async function deleteWorkflow(req: RequestWithUser, res: Response) {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authorized' });
        if (!Types.ObjectId.isValid(req.params.id)) return invalidId(res);

        const result = await workflowService.remove(
            new Types.ObjectId(req.params.id),
            req.user
        );
        if ('message' in result) {
            return res.status(problemStatus(result)).json({ message: String(result.message) });
        }

        return res.status(200).json({ message: 'Workflow deleted successfully.' });
    } catch (error) {
        return res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

export default {
    listWorkflows,
    getWorkflowById,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
};

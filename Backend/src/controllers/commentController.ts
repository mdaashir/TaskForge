import type { RequestWithUser } from '../types.ts';
import type { Response } from 'express';
import commentService from '../services/commentService.ts';

type Failure = { message: string; error?: string; forbidden?: boolean; invalid?: boolean };

const statusOf = (result: Failure) =>
    result.error ? 500 : result.forbidden ? 403 : result.invalid ? 400 : 404;

const failure = (res: Response, result: Failure) =>
    res.status(statusOf(result)).json({ message: result.message });

const serverError = (res: Response, error: unknown) =>
    res.status(500).json({
        message: 'Server error',
        error: error instanceof Error ? error.message : String(error),
    });

async function listTaskComments(req: RequestWithUser, res: Response) {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authorized' });

        const result = await commentService.listForTask(req.params.taskId, req.user);
        if (!result.ok) return failure(res, result);

        return res.status(200).json({ comments: result.comments });
    } catch (error) {
        return serverError(res, error);
    }
}

async function createComment(req: RequestWithUser, res: Response) {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authorized' });

        const result = await commentService.create(req.params.taskId, req.body.comment, req.user);
        if (!result.ok) return failure(res, result);

        return res.status(201).json({ message: 'Comment added.', comment: result.comment });
    } catch (error) {
        return serverError(res, error);
    }
}

async function updateComment(req: RequestWithUser, res: Response) {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authorized' });

        const result = await commentService.update(req.params.id, req.body.comment.text, req.user);
        if (!result.ok) return failure(res, result);

        return res.status(200).json({ message: 'Comment updated.', comment: result.comment });
    } catch (error) {
        return serverError(res, error);
    }
}

async function deleteComment(req: RequestWithUser, res: Response) {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authorized' });

        const result = await commentService.remove(req.params.id, req.user);
        if (!result.ok) return failure(res, result);

        return res.status(200).json({ message: 'Comment deleted.' });
    } catch (error) {
        return serverError(res, error);
    }
}

export default { listTaskComments, createComment, updateComment, deleteComment };

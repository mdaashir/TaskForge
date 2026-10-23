import type { RequestWithUser } from '../types.ts';
import type { Response } from 'express';
import fileService from '../services/fileService.ts';

const problemStatus = (result: object) =>
    'error' in result ? 500 : 'forbidden' in result ? 403 : 404;

const failure = (res: Response, result: object) =>
    res.status(problemStatus(result)).json({ message: String((result as { message?: unknown }).message) });

async function uploadTaskFile(req: RequestWithUser, res: Response) {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authorized' });
        if (!req.file) return res.status(400).json({ message: 'A file is required' });

        const result = await fileService.uploadForTask(req.params.taskId, req.file, req.user);
        if ('message' in result) return failure(res, result);

        return res.status(201).json({ message: 'File uploaded successfully.', file: result.file });
    } catch (error) {
        return res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

async function listTaskFiles(req: RequestWithUser, res: Response) {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authorized' });

        const result = await fileService.listForTask(req.params.taskId, req.user);
        if ('message' in result) return failure(res, result);

        return res.status(200).json({ files: result.files });
    } catch (error) {
        return res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

async function uploadProjectFile(req: RequestWithUser, res: Response) {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authorized' });
        if (!req.file) return res.status(400).json({ message: 'A file is required' });

        const result = await fileService.uploadForProject(req.params.projectId, req.file, req.user);
        if ('message' in result) return failure(res, result);

        return res.status(201).json({ message: 'File uploaded successfully.', file: result.file });
    } catch (error) {
        return res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

async function listProjectFiles(req: RequestWithUser, res: Response) {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authorized' });

        const result = await fileService.listForProject(req.params.projectId, req.user);
        if ('message' in result) return failure(res, result);

        return res.status(200).json({ files: result.files });
    } catch (error) {
        return res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

async function uploadCommentFile(req: RequestWithUser, res: Response) {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authorized' });
        if (!req.file) return res.status(400).json({ message: 'A file is required' });

        const result = await fileService.uploadForComment(
            req.params.commentId,
            req.file,
            req.user
        );
        if ('message' in result) return failure(res, result);

        return res.status(201).json({ message: 'File uploaded successfully.', file: result.file });
    } catch (error) {
        return res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

async function listCommentFiles(req: RequestWithUser, res: Response) {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authorized' });

        const result = await fileService.listForComment(req.params.commentId, req.user);
        if ('message' in result) return failure(res, result);

        return res.status(200).json({ files: result.files });
    } catch (error) {
        return res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

async function downloadFile(req: RequestWithUser, res: Response) {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authorized' });

        const result = await fileService.download(req.params.id, req.user);
        if ('message' in result) return failure(res, result);

        const filename = encodeURIComponent(result.file.originalName);
        res.setHeader('Content-Type', result.contentType);
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${filename}"; filename*=UTF-8''${filename}`
        );
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
        if (result.contentLength) res.setHeader('Content-Length', String(result.contentLength));

        result.body.on('error', () => {
            if (!res.headersSent) res.status(502).end();
            else res.end();
        });
        return result.body.pipe(res);
    } catch (error) {
        return res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

async function deleteFile(req: RequestWithUser, res: Response) {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authorized' });

        const result = await fileService.remove(req.params.id, req.user);
        if ('message' in result) return failure(res, result);

        return res.status(200).json({ message: 'File deleted successfully.' });
    } catch (error) {
        return res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

export default {
    uploadTaskFile,
    listTaskFiles,
    uploadProjectFile,
    listProjectFiles,
    uploadCommentFile,
    listCommentFiles,
    downloadFile,
    deleteFile,
};

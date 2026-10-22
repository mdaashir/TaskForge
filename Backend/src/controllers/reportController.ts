import type { RequestWithUser } from '../types.ts';
import type { Response } from 'express';
import reportService from '../services/reportService.ts';

const WORKBOOK_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const queryString = (value: unknown) => (typeof value === 'string' ? value : undefined);

const sendWorkbook = (res: Response, workbook: { buffer: Buffer; filename: string }) => {
    res.setHeader('Content-Type', WORKBOOK_MIME);
    res.setHeader('Content-Disposition', `attachment; filename="${workbook.filename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    return res.status(200).send(workbook.buffer);
};

const serverError = (res: Response, error: unknown) =>
    res.status(500).json({
        message: 'Server error',
        error: error instanceof Error ? error.message : String(error),
    });

async function exportTasks(req: RequestWithUser, res: Response) {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authorized' });

        const result = await reportService.tasksWorkbook(req.user, {
            search: queryString(req.query.search),
            projectId: queryString(req.query.projectId),
            status: queryString(req.query.status),
        });
        if ('message' in result) {
            return res.status('error' in result ? 500 : 400).json({ message: result.message });
        }

        return sendWorkbook(res, result);
    } catch (error) {
        return serverError(res, error);
    }
}

async function exportProjects(req: RequestWithUser, res: Response) {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authorized' });

        const result = await reportService.projectsWorkbook(req.user, {
            search: queryString(req.query.search),
            status: queryString(req.query.status),
        });
        if ('message' in result) {
            return res.status('error' in result ? 500 : 400).json({ message: result.message });
        }

        return sendWorkbook(res, result);
    } catch (error) {
        return serverError(res, error);
    }
}

export default { exportTasks, exportProjects };

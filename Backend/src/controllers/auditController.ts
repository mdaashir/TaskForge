import type { RequestWithUser } from '../types.ts';
import type { Response } from 'express';
import auditService from '../services/auditService.ts';

const queryString = (value: unknown) => (typeof value === 'string' ? value : undefined);

async function listAudit(req: RequestWithUser, res: Response) {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authorized' });

        const result = await auditService.list({
            page: Number(req.query.page) || 1,
            limit: Number(req.query.limit) || 20,
            entity: queryString(req.query.entity),
            action: queryString(req.query.action),
            userId: queryString(req.query.userId),
        });

        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

export default { listAudit };

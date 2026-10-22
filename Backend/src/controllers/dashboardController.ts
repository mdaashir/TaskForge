import type { RequestWithUser } from '../types.ts';
import type { Response } from 'express';
import dashboardService from '../services/dashboardService.ts';

async function getDashboard(req: RequestWithUser, res: Response) {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authorized' });

        const result = await dashboardService.getDashboard(req.user);
        if ('message' in result)
            return res.status('error' in result ? 500 : 400).json({ message: result.message });

        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

export default { getDashboard };

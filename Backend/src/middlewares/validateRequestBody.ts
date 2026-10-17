import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

export const validateRequestBody = (schema: ZodType) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({
                message: 'Validation failed',
                details: result.error.issues.map((issue) => ({
                    path: issue.path.join('.'),
                    message: issue.message,
                })),
            });
        }
        req.body = result.data;
        next();
    };
};

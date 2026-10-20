import multer from 'multer';
import type { NextFunction, Request, Response } from 'express';

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
]);

const singleFile = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_BYTES, files: 1 },
    fileFilter: (_req, file, callback) => {
        if (!ALLOWED_TYPES.has(file.mimetype)) {
            callback(new Error(`Unsupported file type: ${file.mimetype}`));
            return;
        }
        callback(null, true);
    },
}).single('file');

export const uploadSingleFile = (req: Request, res: Response, next: NextFunction) => {
    singleFile(req, res, (error) => {
        if (error) {
            return res
                .status(400)
                .json({ message: error instanceof Error ? error.message : String(error) });
        }
        next();
    });
};

import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

const text = z
    .string()
    .trim()
    .min(1, 'Comment text is required')
    .max(5000, 'Comment is too long');

export const createCommentSchema = z.object({
    comment: z.object({
        text,
        parentId: objectId.optional(),
    }),
});

export const updateCommentSchema = z.object({
    comment: z.object({ text }),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;

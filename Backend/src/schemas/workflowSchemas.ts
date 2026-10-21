import { z } from 'zod';
import { Status } from '../enums/enums.ts';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');
const statusSchema = z.enum(Status.list() as [string, ...string[]]);

const workflowFields = {
    name: z.string().trim().min(1, 'Name is required'),
    description: z.string().trim().optional(),
    parentId: objectId.nullable().optional(),
    owner: objectId.optional(),
    members: z.array(objectId).optional(),
    project: z.array(objectId).optional(),
    status: statusSchema.optional(),
};

export const createWorkflowSchema = z.object({
    workflow: z.object(workflowFields),
});

export const updateWorkflowSchema = z.object({
    workflow: z
        .object({
            ...workflowFields,
            name: workflowFields.name.optional(),
        })
        .refine((value) => Object.keys(value).length > 0, {
            message: 'At least one field is required',
        }),
});

export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;
export type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>;

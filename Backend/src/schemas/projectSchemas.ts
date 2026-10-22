import { z } from 'zod';
import { Priority, Status } from '../enums/enums.ts';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');
const prioritySchema = z.enum(Priority.list() as [string, ...string[]]);
const statusSchema = z.enum(Status.list() as [string, ...string[]]);

const projectFields = {
    name: z.string().trim().min(1, 'Name is required'),
    description: z.string().trim().optional(),
    owner: objectId.optional(),
    members: z.array(objectId).optional(),
    priority: prioritySchema.optional(),
    status: statusSchema.optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    progress: z.coerce.number().min(0).max(100).optional(),
    tags: z.array(z.string().trim().min(1)).optional(),
};

export const createProjectSchema = z.object({
    project: z.object(projectFields),
});

export const updateProjectSchema = z.object({
    project: z
        .object({
            ...projectFields,
            name: projectFields.name.optional(),
        })
        .refine((value) => Object.keys(value).length > 0, {
            message: 'At least one field is required',
        }),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

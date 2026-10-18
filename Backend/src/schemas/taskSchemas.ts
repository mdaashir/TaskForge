import { z } from 'zod';
import { Priority, Status } from '../enums/enums.ts';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');
const prioritySchema = z.enum(Priority.list() as [string, ...string[]]);
const statusSchema = z.enum(Status.list() as [string, ...string[]]);

const todoSchema = z.object({
    text: z.string().trim().min(1, 'Checklist item text is required'),
    completed: z.boolean().optional(),
});

const taskFields = {
    description: z.string().trim().optional(),
    priority: prioritySchema.optional(),
    status: statusSchema.optional(),
    dueDate: z.coerce.date().optional(),
    assignedTo: z.array(objectId).optional(),
    todoChecklist: z.array(todoSchema).optional(),
    progress: z.coerce.number().min(0).max(100).optional(),
    tags: z.array(z.string().trim().min(1)).optional(),
};

export const createTaskSchema = z.object({
    task: z.object({
        projectId: objectId,
        title: z.string().trim().min(1, 'Title is required'),
        ...taskFields,
    }),
});

export const updateTaskSchema = z.object({
    task: z
        .object({
            title: z.string().trim().min(1, 'Title cannot be empty').optional(),
            ...taskFields,
        })
        .refine((value) => Object.keys(value).length > 0, {
            message: 'At least one field is required',
        }),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

import { z } from 'zod';
import { MemberType, Roles, State } from '../enums/enums.ts';
import { passwordSchema } from './authSchemas.ts';

const memberTypeSchema = z.enum(MemberType.list() as [string, ...string[]]);
const rolesSchema = z.array(z.enum(Roles.list() as [string, ...string[]]));
const stateSchema = z.enum(State.list() as [string, ...string[]]);

export const createUserSchema = z.object({
    user: z.object({
        name: z.string().trim().min(1, 'Name is required'),
        email: z.string().trim().toLowerCase().email('A valid email is required'),
        password: passwordSchema,
        memberType: memberTypeSchema.optional(),
        roles: rolesSchema.optional(),
        state: stateSchema.optional(),
    }),
});

export const updateUserSchema = z.object({
    user: z
        .object({
            name: z.string().trim().min(1, 'Name cannot be empty').optional(),
            email: z.string().trim().toLowerCase().email('A valid email is required').optional(),
            password: passwordSchema.optional(),
            memberType: memberTypeSchema.optional(),
            roles: rolesSchema.optional(),
            state: stateSchema.optional(),
            tags: z.array(z.string().trim().min(1)).optional(),
        })
        .refine((value) => Object.keys(value).length > 0, {
            message: 'At least one field is required',
        }),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

import { z } from 'zod';

export const passwordSchema = z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Za-z]/, 'Password must contain a letter')
    .regex(/[0-9]/, 'Password must contain a number');

export const registerSchema = z.object({
    user: z.object({
        name: z.string().trim().min(1, 'Name is required'),
        email: z.string().trim().toLowerCase().email('A valid email is required'),
        password: passwordSchema,
    }),
});

export const loginSchema = z.object({
    email: z.string().trim().toLowerCase().email('A valid email is required'),
    password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
    user: z
        .object({
            name: z.string().trim().min(1, 'Name cannot be empty').optional(),
            email: z.string().trim().toLowerCase().email('A valid email is required').optional(),
            password: passwordSchema.optional(),
            profileImageUrl: z.string().url('A valid url is required').optional(),
            tags: z.array(z.string().trim().min(1)).optional(),
        })
        .refine((value) => Object.keys(value).length > 0, {
            message: 'At least one field is required',
        }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

import bcrypt from 'bcryptjs';
import { Types, type FilterQuery } from 'mongoose';
import userModel from '../models/User.ts';
import type { IUser } from '../types.ts';
import { generateAccessToken, generateRefreshToken } from '../utils/jwtUtils.ts';

async function getAll(options: { page?: number; limit?: number; search?: string } = {}) {
    try {
        const page = Math.max(1, options.page ?? 1);
        const limit = Math.min(100, Math.max(1, options.limit ?? 20));
        const filter: FilterQuery<IUser> = {};

        if (options.search) {
            const escaped = options.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const pattern = new RegExp(escaped, 'i');
            filter.$or = [{ name: pattern }, { email: pattern }];
        }

        const [users, total] = await Promise.all([
            userModel
                .find(filter)
                .select('-password')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            userModel.countDocuments(filter),
        ]);

        return { users, total, page, limit };
    } catch (error) {
        return error instanceof Error
            ? { message: 'Error fetching users', error: error.message }
            : { message: 'An unknown error occurred while fetching users.' };
    }
}

async function getOne(userId: Types.ObjectId, fields: string[] = []) {
    try {
        if (!Types.ObjectId.isValid(userId)) return { message: 'Invalid user ID.' };
        const projection = fields.reduce((acc, field) => ({ ...acc, [field]: 1 }), {
            password: 0,
            __v: 0,
            createdAt: 0,
            updatedAt: 0,
        });
        const user = await userModel.findById(userId, projection);
        if (!user) return { message: 'User not found.' };
        return { user };
    } catch (error) {
        return error instanceof Error
            ? { message: 'Error fetching user', error: error.message }
            : { message: 'An unknown error occurred while fetching the user.' };
    }
}

async function createUser(data: IUser) {
    try {
        const user = new userModel(data);
        await user.validate();
        const exists = await userModel.exists({ email: user.email });
        if (exists) return { message: 'User with this email already exists.' };
        const result = await user.save();
        return {
            user: result,
            accessToken: generateAccessToken(result),
            refreshToken: generateRefreshToken(result),
        };
    } catch (error) {
        return error instanceof Error
            ? { message: 'Invalid user data', error: error.message }
            : { message: 'An unknown error occurred while creating the user.' };
    }
}

async function login(email: string, password: string) {
    try {
        const user = await userModel.findOne({ email });
        if (!user) return { message: 'Invalid credentials.' };
        const matches = await bcrypt.compare(password, user.password);
        if (!matches) return { message: 'Invalid credentials.' };
        user.lastLogin = new Date();
        await user.save();
        return {
            user,
            accessToken: generateAccessToken(user),
            refreshToken: generateRefreshToken(user),
        };
    } catch (error) {
        return error instanceof Error
            ? { message: 'Error logging in', error: error.message }
            : { message: 'An unknown error occurred while logging in.' };
    }
}

async function updateUser(userId: Types.ObjectId, data: Partial<IUser>) {
    try {
        if (!Types.ObjectId.isValid(userId)) return { message: 'Invalid user ID.' };
        const user = await userModel.findById(userId);
        if (!user) return { message: 'User not found.' };
        if (data.email && data.email !== user.email) {
            const exists = await userModel.exists({ email: data.email });
            if (exists) return { message: 'Email already in use by another user.' };
        }
        Object.assign(user, data);
        await user.validate();
        const result = await user.save();
        return { user: result };
    } catch (error) {
        return error instanceof Error
            ? { message: 'Invalid user data', error: error.message }
            : { message: 'An unknown error occurred while updating the user.' };
    }
}

async function deleteUser(userId: Types.ObjectId) {
    try {
        if (!Types.ObjectId.isValid(userId)) return { message: 'Invalid user ID.' };
        const result = await userModel.findByIdAndDelete(userId);
        if (!result) return { message: 'User not found.' };
        return { success: true as const };
    } catch (error) {
        return error instanceof Error
            ? { message: 'Error deleting user', error: error.message }
            : { message: 'An unknown error occurred while deleting the user.' };
    }
}

export default { getAll, getOne, createUser, login, updateUser, deleteUser };

import bcrypt from 'bcryptjs';
import { Types, type FilterQuery } from 'mongoose';
import { Actions, Entity } from '../enums/enums.ts';
import userModel from '../models/User.ts';
import type { IUser } from '../types.ts';
import { idOf } from '../utils/access.ts';
import { generateAccessToken, generateRefreshToken } from '../utils/jwtUtils.ts';
import auditService from './auditService.ts';

type ArchivedView = 'active' | 'archived' | 'all';

async function getAll(
    options: { page?: number; limit?: number; search?: string; archived?: ArchivedView } = {}
) {
    try {
        const page = Math.max(1, options.page ?? 1);
        const limit = Math.min(100, Math.max(1, options.limit ?? 20));
        const filter: FilterQuery<IUser> = {};

        if (options.archived === 'archived') filter.archived = true;
        else if (options.archived !== 'all') filter.archived = { $ne: true };

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

async function createUser(data: IUser, actor?: IUser) {
    try {
        const user = new userModel(data);
        await user.validate();
        const exists = await userModel.exists({ email: user.email });
        if (exists) return { message: 'User with this email already exists.' };
        const result = await user.save();
        if (actor) {
            await auditService.record({
                actor,
                action: String(Actions.Create),
                entity: String(Entity.User),
                targetId: result._id as Types.ObjectId,
                newData: result,
            });
        }
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
        if (user.archived) return { message: 'This account has been archived.' };
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

async function updateUser(userId: Types.ObjectId, data: Partial<IUser>, actor?: IUser) {
    try {
        if (!Types.ObjectId.isValid(userId)) return { message: 'Invalid user ID.' };
        const user = await userModel.findById(userId);
        if (!user) return { message: 'User not found.' };
        if (data.email && data.email !== user.email) {
            const exists = await userModel.exists({ email: data.email });
            if (exists) return { message: 'Email already in use by another user.' };
        }
        const before = user.toObject();
        Object.assign(user, data);
        await user.validate();
        const result = await user.save();
        if (actor) {
            const { oldData, newData } = auditService.diff(before, result);
            if (oldData || newData) {
                await auditService.record({
                    actor,
                    action: String(Actions.Update),
                    entity: String(Entity.User),
                    targetId: result._id as Types.ObjectId,
                    oldData,
                    newData,
                });
            }
        }
        return { user: result };
    } catch (error) {
        return error instanceof Error
            ? { message: 'Invalid user data', error: error.message }
            : { message: 'An unknown error occurred while updating the user.' };
    }
}

async function deleteUser(userId: Types.ObjectId, actor?: IUser) {
    try {
        if (!Types.ObjectId.isValid(userId)) return { message: 'Invalid user ID.' };
        const result = await userModel.findByIdAndDelete(userId);
        if (!result) return { message: 'User not found.' };
        if (actor) {
            await auditService.record({
                actor,
                action: String(Actions.Delete),
                entity: String(Entity.User),
                targetId: result._id as Types.ObjectId,
                oldData: result,
            });
        }
        return { success: true as const };
    } catch (error) {
        return error instanceof Error
            ? { message: 'Error deleting user', error: error.message }
            : { message: 'An unknown error occurred while deleting the user.' };
    }
}

async function getOptions() {
    try {
        const users = await userModel
            .find({ archived: { $ne: true } })
            .select('name email memberType')
            .sort({ name: 1 });
        return { users };
    } catch (error) {
        return error instanceof Error
            ? { message: 'Error fetching user options', error: error.message }
            : { message: 'An unknown error occurred while fetching user options.' };
    }
}

async function setArchived(userId: Types.ObjectId, actor: IUser, archived: boolean) {
    try {
        if (!Types.ObjectId.isValid(userId)) return { message: 'Invalid user ID.' };
        if (archived && idOf(userId) === idOf(actor._id)) {
            return {
                message: 'You cannot archive your own account.',
                invalid: true as const,
            };
        }

        const user = await userModel.findById(userId);
        if (!user) return { message: 'User not found.' };
        if (Boolean(user.archived) === archived) return { user };

        user.archived = archived;
        if (archived) {
            user.archivedAt = new Date();
            user.archivedBy = actor._id as Types.ObjectId;
        } else {
            user.archivedAt = undefined;
            user.archivedBy = undefined;
        }

        const result = await user.save();

        await auditService.record({
            actor,
            action: String(archived ? Actions.Archive : Actions.Restore),
            entity: String(Entity.User),
            targetId: result._id as Types.ObjectId,
            oldData: { archived: !archived },
            newData: { archived },
        });

        return { user: result };
    } catch (error) {
        return error instanceof Error
            ? {
                  message: `Error ${archived ? 'archiving' : 'restoring'} user`,
                  error: error.message,
              }
            : {
                  message: `An unknown error occurred while ${
                      archived ? 'archiving' : 'restoring'
                  } the user.`,
              };
    }
}

const archive = (userId: Types.ObjectId, actor: IUser) => setArchived(userId, actor, true);
const restore = (userId: Types.ObjectId, actor: IUser) => setArchived(userId, actor, false);

export default {
    getAll,
    getOptions,
    getOne,
    createUser,
    login,
    updateUser,
    archive,
    restore,
    deleteUser,
};

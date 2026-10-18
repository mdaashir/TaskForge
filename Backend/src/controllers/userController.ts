import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import userService from '../services/userService.ts';

async function listUsers(req: Request, res: Response) {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;
        const search = typeof req.query.search === 'string' ? req.query.search : undefined;

        const result = await userService.getAll({ page, limit, search });
        if ('message' in result)
            return res.status('error' in result ? 500 : 400).json({ message: result.message });

        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

async function getUserById(req: Request, res: Response) {
    try {
        if (!Types.ObjectId.isValid(req.params.id))
            return res.status(400).json({ message: 'Invalid user id' });

        const result = await userService.getOne(new Types.ObjectId(req.params.id));
        if ('message' in result)
            return res.status('error' in result ? 500 : 404).json({ message: result.message });

        return res.status(200).json({ user: result.user });
    } catch (error) {
        return res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

async function createUser(req: Request, res: Response) {
    try {
        const result = await userService.createUser(req.body.user);
        if ('message' in result)
            return res.status('error' in result ? 500 : 400).json({ message: result.message });

        return res.status(201).json({ message: 'User created successfully.', user: result.user });
    } catch (error) {
        return res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

async function updateUser(req: Request, res: Response) {
    try {
        if (!Types.ObjectId.isValid(req.params.id))
            return res.status(400).json({ message: 'Invalid user id' });

        const result = await userService.updateUser(
            new Types.ObjectId(req.params.id),
            req.body.user
        );
        if ('message' in result)
            return res.status('error' in result ? 500 : 400).json({ message: result.message });

        return res.status(200).json({ message: 'User updated successfully.', user: result.user });
    } catch (error) {
        return res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

async function deleteUser(req: Request, res: Response) {
    try {
        if (!Types.ObjectId.isValid(req.params.id))
            return res.status(400).json({ message: 'Invalid user id' });

        const result = await userService.deleteUser(new Types.ObjectId(req.params.id));
        if ('message' in result)
            return res.status('error' in result ? 500 : 404).json({ message: result.message });

        return res.status(200).json({ message: 'User deleted successfully.' });
    } catch (error) {
        return res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

export default { listUsers, getUserById, createUser, updateUser, deleteUser };

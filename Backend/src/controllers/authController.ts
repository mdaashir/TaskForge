import type { CookieOptions, Request, Response } from 'express';
import { Types } from 'mongoose';
import userService from '../services/userService.ts';
import type { RequestWithUser } from '../types.ts';
import {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
} from '../utils/jwtUtils.ts';
import { generateProfileImage } from '../utils/profileUtils.ts';

const REFRESH_COOKIE = 'refreshToken';
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function refreshCookieOptions(): CookieOptions {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: `${process.env.PREFIX || '/api'}/auth/refresh`,
        maxAge: REFRESH_MAX_AGE,
    };
}

function setRefreshCookie(res: Response, token: string) {
    res.cookie(REFRESH_COOKIE, token, refreshCookieOptions());
}

function clearRefreshCookie(res: Response) {
    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
}

async function registerUser(req: Request, res: Response) {
    try {
        const result = await userService.createUser(req.body.user);
        if ('message' in result) return res.status(400).json({ message: result.message });

        setRefreshCookie(res, result.refreshToken);
        return res.status(201).json({
            message: 'User created successfully.',
            user: result.user,
            accessToken: result.accessToken,
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

async function loginUser(req: Request, res: Response) {
    try {
        const { email, password } = req.body;
        const result = await userService.login(email, password);
        if ('message' in result)
            return res.status('error' in result ? 500 : 401).json({ message: result.message });

        setRefreshCookie(res, result.refreshToken);
        return res.status(200).json({
            message: 'Logged in successfully.',
            user: result.user,
            accessToken: result.accessToken,
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

async function refreshAccessToken(req: Request, res: Response) {
    try {
        const token = req.cookies?.[REFRESH_COOKIE];
        if (!token) return res.status(401).json({ message: 'No refresh token provided' });

        const decoded = verifyRefreshToken(token);
        if (!decoded?.id) return res.status(401).json({ message: 'Invalid refresh token' });

        const result = await userService.getOne(decoded.id);
        if ('message' in result)
            return res.status('error' in result ? 500 : 401).json({ message: result.message });

        const user = result.user;
        setRefreshCookie(res, generateRefreshToken(user));
        return res.status(200).json({ accessToken: generateAccessToken(user) });
    } catch (error) {
        return res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

async function logoutUser(_req: Request, res: Response) {
    try {
        clearRefreshCookie(res);
        return res.status(200).json({ message: 'Logged out successfully.' });
    } catch (error) {
        return res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

async function getUserProfile(req: RequestWithUser, res: Response) {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authorized' });
        return res.status(200).json({ user: req.user });
    } catch (error) {
        return res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

async function updateUserProfile(req: RequestWithUser, res: Response) {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authorized' });

        const result = await userService.updateUser(req.user._id as Types.ObjectId, req.body.user);
        if ('message' in result) return res.status(400).json({ message: result.message });

        return res.status(200).json({ message: 'Profile updated successfully.', user: result.user });
    } catch (error) {
        return res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

async function getProfileImage(req: Request, res: Response) {
    try {
        const value = req.params.value;
        let name = '';

        if (Types.ObjectId.isValid(value)) {
            const result = await userService.getOne(new Types.ObjectId(value), ['name']);
            if ('message' in result) return res.status(404).json({ message: result.message });
            name = result.user.name;
        } else {
            name = value.trim();
        }

        res.setHeader('Content-Type', 'image/svg+xml');
        return res.send(generateProfileImage(name));
    } catch (error) {
        return res.status(500).json({
            message: 'Server error',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

export default {
    registerUser,
    loginUser,
    refreshAccessToken,
    logoutUser,
    getUserProfile,
    updateUserProfile,
    getProfileImage,
};

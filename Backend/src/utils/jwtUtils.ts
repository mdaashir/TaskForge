import jwt from 'jsonwebtoken';
import type { IUser, JwtPayloadWithId } from '../types.ts';

const ACCESS_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_IN = '7d';

function generateAccessToken(user: IUser): string {
    return jwt.sign({ id: user._id, memberType: user.memberType }, String(process.env.JWT_SECRET), {
        expiresIn: ACCESS_EXPIRES_IN,
    });
}

function generateRefreshToken(user: IUser): string {
    return jwt.sign({ id: user._id }, String(process.env.REFRESH_TOKEN_SECRET), {
        expiresIn: REFRESH_EXPIRES_IN,
    });
}

function verifyAccessToken(token: string): JwtPayloadWithId | null {
    try {
        return jwt.verify(token, String(process.env.JWT_SECRET)) as JwtPayloadWithId;
    } catch {
        return null;
    }
}

function verifyRefreshToken(token: string): JwtPayloadWithId | null {
    try {
        return jwt.verify(token, String(process.env.REFRESH_TOKEN_SECRET)) as JwtPayloadWithId;
    } catch {
        return null;
    }
}

export {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    ACCESS_EXPIRES_IN,
    REFRESH_EXPIRES_IN,
};

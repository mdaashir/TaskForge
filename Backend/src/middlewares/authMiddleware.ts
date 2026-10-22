import type { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import { MemberType } from '../enums/enums.ts';
import User from '../models/User.ts';
import type { JwtPayloadWithId, RequestWithUser } from '../types.ts';

const Role = Object.freeze({
    Admin: String(MemberType.Admin),
    Viewer: String(MemberType.Viewer),
    User: String(MemberType.User),
});

async function authenticate(req: RequestWithUser) {
    try {
        let token = req.headers.authorization;

        if (token && token.startsWith('Bearer ')) {
            token = token.split(' ')[1];
            const decoded = jwt.verify(token, String(process.env.JWT_SECRET)) as JwtPayloadWithId;
            if (typeof decoded === 'object' && decoded.id) {
                req.user = await User.findById(decoded.id).select('-password');
                if (!req.user) return { message: 'Not authorized, user not found' };
                if (req.user.archived) return { message: 'This account has been archived.' };
                return;
            }
            return { message: 'Not authorized, invalid token' };
        }
        return { message: 'Not authorized, no token' };
    } catch (error) {
        return {
            message: 'Not authorized, token failed',
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

function authorize(allowedRoles: string[]) {
    return async function (req: RequestWithUser, res: Response, next: NextFunction) {
        const result = await authenticate(req);
        if (result && result.message) return res.status(401).json(result);

        if (!req.user?.memberType)
            return res.status(403).json({ message: 'Access denied: no user roles found' });

        if (!allowedRoles.includes(req.user.memberType))
            return res.status(403).json({ message: 'Access denied: insufficient permissions' });

        next();
    };
}

export { authorize, Role };

import { Types, type FilterQuery } from 'mongoose';
import auditLogModel from '../models/AuditLog.ts';
import type { IAuditLog, IUser } from '../types.ts';

type Snapshot = Record<string, unknown> | null;

const IGNORED_KEYS = new Set(['password', '__v', 'createdAt', 'updatedAt', '_id']);

/** Converts a document/object into a sanitized plain object for storage. */
function snapshot(value: unknown): Snapshot {
    if (!value || typeof value !== 'object') return null;
    try {
        const plain = JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
        for (const key of Object.keys(plain)) {
            if (IGNORED_KEYS.has(key)) delete plain[key];
        }
        return plain;
    } catch {
        return null;
    }
}

/** Returns only the fields that differ between two snapshots. */
function diff(before: unknown, after: unknown): { oldData: Snapshot; newData: Snapshot } {
    const oldPlain = snapshot(before);
    const newPlain = snapshot(after);
    if (!oldPlain || !newPlain) return { oldData: null, newData: null };

    const oldData: Record<string, unknown> = {};
    const newData: Record<string, unknown> = {};

    for (const key of new Set([...Object.keys(oldPlain), ...Object.keys(newPlain)])) {
        if (JSON.stringify(oldPlain[key]) === JSON.stringify(newPlain[key])) continue;
        oldData[key] = oldPlain[key] ?? null;
        newData[key] = newPlain[key] ?? null;
    }

    return {
        oldData: Object.keys(oldData).length ? oldData : null,
        newData: Object.keys(newData).length ? newData : null,
    };
}

async function record(entry: {
    actor: IUser;
    action: string;
    entity: string;
    targetId: Types.ObjectId | string;
    oldData?: unknown;
    newData?: unknown;
}) {
    try {
        await auditLogModel.create({
            userId: entry.actor._id,
            action: entry.action,
            entity: entry.entity,
            targetId: entry.targetId,
            oldData: entry.oldData ? snapshot(entry.oldData) : null,
            newData: entry.newData ? snapshot(entry.newData) : null,
        });
    } catch {
        // Audit writes are best-effort: never fail the action being recorded.
    }
}

async function list(
    options: {
        page?: number;
        limit?: number;
        entity?: string;
        action?: string;
        userId?: string;
    } = {}
) {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 20));

    const filter: FilterQuery<IAuditLog> = {};
    if (options.entity) filter.entity = options.entity;
    if (options.action) filter.action = options.action;
    if (options.userId) filter.userId = options.userId;

    const [entries, total] = await Promise.all([
        auditLogModel
            .find(filter)
            .populate('userId', 'name email')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit),
        auditLogModel.countDocuments(filter),
    ]);

    return { entries, total, page, limit };
}

export default { record, list, snapshot, diff };

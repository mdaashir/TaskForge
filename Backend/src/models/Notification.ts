import mongoose from 'mongoose';
import { Entity, Status, Priority } from '../enums/enums.ts';
import type { INotification, IRead } from '../types.ts';

const readSchema = new mongoose.Schema<IRead>(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, required: true },
        received: { type: Boolean, default: false },
        receivedAt: { type: Date, default: Date.now },
        seen: { type: Boolean, default: false },
        seenAt: { type: Date, default: Date.now },
    },
    {
        timestamps: true,
    }
);

const notificationSchema = new mongoose.Schema<INotification>(
    {
        fromId: { type: mongoose.Schema.Types.ObjectId, required: true },
        toId: { type: mongoose.Schema.Types.ObjectId, required: true },
        targetId: { type: mongoose.Schema.Types.ObjectId },
        entity: { type: String, enum: Entity.list(), required: true },
        message: { type: String },
        status: { type: String, enum: Status.list() },
        priority: { type: String, enum: Priority.list() },
        read: { type: [readSchema], default: [] },
        readCount: { type: Number, default: 0 },
    },
    {
        timestamps: true,
    }
);

const Notification = mongoose.model<INotification>(
    'Notification',
    notificationSchema,
    'notifications'
);

export default Notification;

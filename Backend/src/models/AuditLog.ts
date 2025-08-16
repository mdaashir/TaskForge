import mongoose from 'mongoose';
import { Actions, Entity } from '../enums/enums.ts';
import { IAuditLog } from '../types.ts';

const auditLogSchema = new mongoose.Schema<IAuditLog>(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        action: { type: String, enum: Actions.list(), required: true },
        entity: { type: String, enum: Entity.list(), required: true },
        targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
        newData: { type: mongoose.Schema.Types.Mixed, default: null },
        oldData: { type: mongoose.Schema.Types.Mixed, default: null },
        achievedId: { type: mongoose.Schema.Types.ObjectId, default: null },
        updatedId: { type: mongoose.Schema.Types.ObjectId, default: null },
        deletedId: { type: mongoose.Schema.Types.ObjectId, default: null },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);

export default AuditLog;

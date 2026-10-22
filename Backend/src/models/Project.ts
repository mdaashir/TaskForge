import mongoose from 'mongoose';
import { Priority, Status } from '../enums/enums.ts';
import type { IProject } from '../types.ts';

const projectSchema = new mongoose.Schema<IProject>(
    {
        name: { type: String, required: true },
        description: { type: String, default: '' },
        owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
        status: {
            type: String,
            enum: Status.list(),
            default: String(Status.Pending),
        },
        startDate: { type: Date, default: Date.now },
        endDate: { type: Date },
        progress: { type: Number, default: 0 },
        attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'File' }],
        comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
        tags: [{ type: String }],
        priority: {
            type: String,
            enum: Priority.list(),
            default: String(Priority.Medium),
        },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        archived: { type: Boolean, default: false },
        archivedAt: { type: Date },
        archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    {
        timestamps: true,
    }
);

const Project = mongoose.model<IProject>('Project', projectSchema, 'projects');

export default Project;

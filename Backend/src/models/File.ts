import mongoose from 'mongoose';
import { IFile } from '../types.ts';

const fileSchema = new mongoose.Schema<IFile>(
    {
        name: { type: String, required: true },
        originalName: { type: String, required: true },
        url: { type: String, required: true },
        size: { type: Number, required: true },
        type: { type: String, required: true },
        description: { type: String, default: '' },
        tags: [{ type: String }],
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
        taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
        commentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment' },
        meetingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting' },
        issueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue' },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

const File = mongoose.model<IFile>('File', fileSchema);

export default File;

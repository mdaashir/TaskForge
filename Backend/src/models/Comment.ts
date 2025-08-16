import mongoose from 'mongoose';
import { IComment } from '../types.ts';

const commentSchema = new mongoose.Schema<IComment>(
    {
        projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
        taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
        parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment' },
        text: { type: String, required: true },
        childrenId: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
        attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'File' }],
        tags: [{ type: String }],
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

const Comment = mongoose.model<IComment>('Comment', commentSchema);

export default Comment;

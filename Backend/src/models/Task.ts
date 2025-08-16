import mongoose from 'mongoose';
import { Priority, Status } from '../enums/enums.ts';
import { ITask, ITodo } from '../types.ts';

const todoSchema = new mongoose.Schema<ITodo>(
    {
        text: { type: String, required: true },
        completed: { type: Boolean, default: false },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        tags: [{ type: String }],
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

const taskSchema = new mongoose.Schema<ITask>(
    {
        projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
        title: { type: String, required: true },
        description: { type: String },
        priority: {
            type: String,
            enum: Priority.list(),
            default: Priority.Medium,
        },
        status: {
            type: String,
            enum: Status.list(),
            default: Status.Assigned,
        },
        dueDate: { type: Date },
        assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        archived: { type: Boolean, default: false },
        archivedAt: { type: Date },
        archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'File' }],
        comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
        todoChecklist: { type: [todoSchema], default: [] },
        progress: { type: Number, default: 0 },
        tags: [{ type: String }],
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

const Task = mongoose.model<ITask>('Task', taskSchema);

export default Task;

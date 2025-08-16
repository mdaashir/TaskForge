import mongoose from 'mongoose';
import { Status } from '../enums/enums.ts';
import { IWorkFlow } from '../types.ts';

const workFlowSchema = new mongoose.Schema<IWorkFlow>(
    {
        parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkFlow', default: null },
        name: { type: String, required: true },
        description: { type: String, default: '' },
        owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        project: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
        progress: { type: Number, default: 0 },
        status: {
            type: String,
            enum: Status.list(),
            default: Status.Active,
        },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        children: [{ type: mongoose.Schema.Types.ObjectId, ref: 'WorkFlow' }],
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

const WorkFlow = mongoose.model<IWorkFlow>('WorkFlow', workFlowSchema);

export default WorkFlow;

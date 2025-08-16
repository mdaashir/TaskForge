import mongoose from 'mongoose';
import { MemberType, Roles, State } from '../enums/enums.ts';
import { IUser } from '../types.ts';

const UserSchema = new mongoose.Schema<IUser>(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        profileImageUrl: {
            type: String,
            default: 'https://example.com/default-profile-image.png',
        },
        memberType: {
            type: String,
            enum: MemberType.list(),
            default: MemberType.User,
        },
        roles: {
            type: [String],
            enum: Roles.list(),
        },
        state: {
            type: String,
            enum: State.list(),
            default: State.Active,
        },
        archived: { type: Boolean, default: false },
        archivedAt: { type: Date },
        archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        lastLogin: { type: Date, default: Date.now },
        isSynced: { type: Boolean, default: false },
        syncedAt: { type: Date },
        syncedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
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

const User = mongoose.model<IUser>('User', UserSchema);

export default User;

import mongoose from 'mongoose';
import { MemberType, Roles, State } from '../enums/enums.ts';
import type { IUser } from '../types.ts';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema<IUser>(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        profileImageUrl: { type: String },
        memberType: {
            type: String,
            enum: MemberType.list(),
            default: String(MemberType.User),
        },
        roles: {
            type: [String],
            enum: Roles.list(),
        },
        state: {
            type: String,
            enum: State.list(),
            default: String(State.Active),
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
        toJSON: {
            virtuals: true,
            transform: (_doc, ret) => {
                delete (ret as { password?: unknown }).password;
                return ret;
            },
        },
        toObject: { virtuals: true },
    }
);

UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

const User = mongoose.model<IUser>('User', UserSchema, 'users');

export default User;

import { randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Types } from 'mongoose';
import { getStorage } from '../config/storage.ts';
import { Actions, Entity } from '../enums/enums.ts';
import fileModel from '../models/File.ts';
import projectModel from '../models/Project.ts';
import taskModel from '../models/Task.ts';
import type { IFile, IProject, IUser } from '../types.ts';
import { canViewProject, idOf, isAdmin } from '../utils/access.ts';
import auditService from './auditService.ts';

const accessDenied = () => ({ message: 'Access denied.', forbidden: true as const });
const notFound = (label: string) => ({ message: `${label} not found.` });
const invalidId = (label: string) => ({ message: `Invalid ${label} ID.` });
const storageError = (error: unknown) => ({
    message: 'Attachment storage error',
    error: error instanceof Error ? error.message : String(error),
});

async function putObject(prefix: string, file: Express.Multer.File) {
    const { client, bucket } = getStorage();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${prefix}/${randomUUID()}-${safeName}`;

    await client.send(
        new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
            ContentLength: file.size,
        })
    );

    return key;
}

async function saveFile(
    prefix: string,
    file: Express.Multer.File,
    actor: IUser,
    link: { taskId?: Types.ObjectId; projectId: Types.ObjectId }
) {
    const key = await putObject(prefix, file);

    const doc = await fileModel.create({
        name: file.originalname,
        originalName: file.originalname,
        url: key,
        size: file.size,
        type: file.mimetype,
        uploadedBy: actor._id as Types.ObjectId,
        ...link,
    });

    if (link.taskId) {
        await taskModel.updateOne({ _id: link.taskId }, { $push: { attachments: doc._id } });
    } else {
        await projectModel.updateOne(
            { _id: link.projectId },
            { $push: { attachments: doc._id } }
        );
    }

    await auditService.record({
        actor,
        action: String(Actions.Create),
        entity: String(Entity.File),
        targetId: doc._id as Types.ObjectId,
        newData: doc,
    });

    return doc;
}

async function uploadForTask(taskId: string, file: Express.Multer.File, actor: IUser) {
    try {
        if (!Types.ObjectId.isValid(taskId)) return invalidId('task');
        const task = await taskModel.findById(taskId);
        if (!task) return notFound('Task');

        const project = await projectModel.findById(task.projectId);
        if (!project) return notFound('Project');
        if (!canViewProject(project, actor)) return accessDenied();

        const doc = await saveFile(`tasks/${task._id}`, file, actor, {
            taskId: task._id as Types.ObjectId,
            projectId: project._id as Types.ObjectId,
        });
        return { file: doc };
    } catch (error) {
        return storageError(error);
    }
}

async function uploadForProject(projectId: string, file: Express.Multer.File, actor: IUser) {
    try {
        if (!Types.ObjectId.isValid(projectId)) return invalidId('project');
        const project = await projectModel.findById(projectId);
        if (!project) return notFound('Project');
        if (!canViewProject(project, actor)) return accessDenied();

        const doc = await saveFile(`projects/${project._id}`, file, actor, {
            projectId: project._id as Types.ObjectId,
        });
        return { file: doc };
    } catch (error) {
        return storageError(error);
    }
}

async function listForTask(taskId: string, actor: IUser) {
    try {
        if (!Types.ObjectId.isValid(taskId)) return invalidId('task');
        const task = await taskModel.findById(taskId);
        if (!task) return notFound('Task');

        const project = await projectModel.findById(task.projectId);
        if (!project) return notFound('Project');
        if (!canViewProject(project, actor)) return accessDenied();

        const files = await fileModel
            .find({ taskId: task._id })
            .populate('uploadedBy', 'name email')
            .sort({ createdAt: -1 });
        return { files };
    } catch (error) {
        return storageError(error);
    }
}

async function listForProject(projectId: string, actor: IUser) {
    try {
        if (!Types.ObjectId.isValid(projectId)) return invalidId('project');
        const project = await projectModel.findById(projectId);
        if (!project) return notFound('Project');
        if (!canViewProject(project, actor)) return accessDenied();

        const files = await fileModel
            .find({ projectId: project._id, taskId: { $exists: false } })
            .populate('uploadedBy', 'name email')
            .sort({ createdAt: -1 });
        return { files };
    } catch (error) {
        return storageError(error);
    }
}

async function projectForFile(file: IFile): Promise<IProject | null> {
    if (file.taskId) {
        const task = await taskModel.findById(file.taskId);
        if (!task) return null;
        return projectModel.findById(task.projectId);
    }
    if (file.projectId) return projectModel.findById(file.projectId);
    return null;
}

async function download(fileId: string, actor: IUser) {
    try {
        if (!Types.ObjectId.isValid(fileId)) return invalidId('file');
        const file = await fileModel.findById(fileId);
        if (!file) return notFound('File');

        const project = await projectForFile(file);
        if (!project) return notFound('File');
        if (!canViewProject(project, actor)) return accessDenied();

        const { client, bucket } = getStorage();
        const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: file.url }));
        if (!object.Body) return notFound('File');

        return {
            file,
            body: object.Body as Readable,
            contentType: object.ContentType ?? file.type,
            contentLength: object.ContentLength ?? file.size,
        };
    } catch (error) {
        return storageError(error);
    }
}

async function remove(fileId: string, actor: IUser) {
    try {
        if (!Types.ObjectId.isValid(fileId)) return invalidId('file');
        const file = await fileModel.findById(fileId);
        if (!file) return notFound('File');

        if (!isAdmin(actor) && idOf(file.uploadedBy) !== idOf(actor._id)) return accessDenied();

        const { client, bucket } = getStorage();
        await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: file.url }));

        const docId = file._id;
        const taskId = file.taskId;
        const projectId = file.projectId;
        const before = file.toObject();
        await file.deleteOne();

        if (taskId) await taskModel.updateOne({ _id: taskId }, { $pull: { attachments: docId } });
        else if (projectId) {
            await projectModel.updateOne({ _id: projectId }, { $pull: { attachments: docId } });
        }

        await auditService.record({
            actor,
            action: String(Actions.Delete),
            entity: String(Entity.File),
            targetId: docId as Types.ObjectId,
            oldData: before,
        });

        return { success: true as const };
    } catch (error) {
        return storageError(error);
    }
}

export default { uploadForTask, uploadForProject, listForTask, listForProject, download, remove };

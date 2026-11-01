import type { FileAttachment } from '../types.ts';
import { API_PATHS } from './apiPaths.ts';
import axiosInstance from './axiosInstance.ts';

export type AttachmentKind = 'tasks' | 'projects' | 'comments';

export const fetchAttachments = async (
    kind: AttachmentKind,
    targetId: string
): Promise<FileAttachment[]> => {
    const { data } = await axiosInstance.get<{ files: FileAttachment[] }>(
        API_PATHS.files.byTarget(kind, targetId)
    );
    return data.files;
};

export const uploadAttachment = async (
    kind: AttachmentKind,
    targetId: string,
    file: File
): Promise<FileAttachment> => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await axiosInstance.post<{ file: FileAttachment }>(
        API_PATHS.files.byTarget(kind, targetId),
        form
    );
    return data.file;
};

export const deleteAttachment = async (fileId: string): Promise<void> => {
    await axiosInstance.delete(API_PATHS.files.byId(fileId));
};

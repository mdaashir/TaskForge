import type { TaskComment } from '../types.ts';
import { API_PATHS } from './apiPaths.ts';
import axiosInstance from './axiosInstance.ts';

export const fetchTaskComments = async (taskId: string): Promise<TaskComment[]> => {
    const { data } = await axiosInstance.get<{ comments: TaskComment[] }>(
        API_PATHS.comments.forTask(taskId)
    );
    return data.comments;
};

export const createTaskComment = async (
    taskId: string,
    text: string,
    parentId?: string
): Promise<void> => {
    await axiosInstance.post(API_PATHS.comments.forTask(taskId), {
        comment: parentId ? { text, parentId } : { text },
    });
};

export const updateTaskComment = async (commentId: string, text: string): Promise<void> => {
    await axiosInstance.put(API_PATHS.comments.byId(commentId), { comment: { text } });
};

export const deleteTaskComment = async (commentId: string): Promise<void> => {
    await axiosInstance.delete(API_PATHS.comments.byId(commentId));
};

import type { Workflow, WorkflowInput, WorkflowListResponse } from '../types.ts';
import { API_PATHS } from './apiPaths.ts';
import axiosInstance from './axiosInstance.ts';

export const fetchWorkflows = async (params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    parentId?: string;
}): Promise<WorkflowListResponse> => {
    const { data } = await axiosInstance.get<WorkflowListResponse>(API_PATHS.workflows.list, {
        params,
    });
    return data;
};

export const createWorkflow = async (input: WorkflowInput) => {
    const { data } = await axiosInstance.post(API_PATHS.workflows.list, { workflow: input });
    return data.workflow as Workflow;
};

export const updateWorkflow = async (id: string, input: WorkflowInput) => {
    const { data } = await axiosInstance.put(API_PATHS.workflows.byId(id), { workflow: input });
    return data.workflow as Workflow;
};

export const removeWorkflow = async (id: string) => {
    await axiosInstance.delete(API_PATHS.workflows.byId(id));
};

export const parentIdOf = (workflow: Workflow): string | null => {
    if (!workflow.parentId) return null;
    return typeof workflow.parentId === 'string' ? workflow.parentId : workflow.parentId._id;
};

/** The workflow itself plus every descendant — none of them may become its parent. */
export const unavailableParentIds = (workflows: Workflow[], id: string): Set<string> => {
    const blocked = new Set<string>([id]);
    let changed = true;

    while (changed) {
        changed = false;
        for (const workflow of workflows) {
            const parent = parentIdOf(workflow);
            if (parent && blocked.has(parent) && !blocked.has(workflow._id)) {
                blocked.add(workflow._id);
                changed = true;
            }
        }
    }

    return blocked;
};

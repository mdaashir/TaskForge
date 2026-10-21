import type { AuditListResponse } from '../types.ts';
import { API_PATHS } from './apiPaths.ts';
import axiosInstance from './axiosInstance.ts';

export const fetchAuditEntries = async (params: {
    page?: number;
    limit?: number;
    entity?: string;
    action?: string;
}): Promise<AuditListResponse> => {
    const { data } = await axiosInstance.get<AuditListResponse>(API_PATHS.audit.list, { params });
    return data;
};

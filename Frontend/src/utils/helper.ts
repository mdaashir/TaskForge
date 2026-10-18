import axios from 'axios';
import type { MemberType } from '../types.ts';

export function getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data as
            | { message?: string; details?: { path: string; message: string }[] }
            | undefined;
        if (data?.details?.length) return data.details.map((detail) => detail.message).join(', ');
        if (data?.message) return data.message;
        if (error.message) return error.message;
        return 'Request failed';
    }
    return error instanceof Error ? error.message : 'Something went wrong';
}

export const homeForRole = (memberType?: MemberType): string => {
    if (memberType === 'ADMIN') return '/admin/dashboard';
    if (memberType === 'USER') return '/user/dashboard';
    return '/projects';
};

export const refId = (value?: { _id: string } | string): string =>
    !value ? '' : typeof value === 'string' ? value : value._id;

export const refName = (value?: { name: string } | string): string =>
    !value ? '—' : typeof value === 'string' ? value : value.name;

export const labelOf = (options: { value: string; label: string }[], value: string): string =>
    options.find((option) => option.value === value)?.label ?? value;

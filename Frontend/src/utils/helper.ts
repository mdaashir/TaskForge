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

export const relativeTime = (value?: string): string => {
    if (!value) return '—';
    const then = new Date(value).getTime();
    if (Number.isNaN(then)) return '—';

    const seconds = Math.round((Date.now() - then) / 1000);
    if (seconds < 60) return 'just now';

    const units: [number, string][] = [
        [60, 'minute'],
        [60, 'hour'],
        [24, 'day'],
        [30, 'month'],
        [12, 'year'],
    ];

    let amount = seconds;
    let label = 'second';
    for (const [size, name] of units) {
        amount = Math.floor(amount / size);
        label = name;
        if (amount < size) break;
    }

    return `${amount} ${label}${amount === 1 ? '' : 's'} ago`;
};

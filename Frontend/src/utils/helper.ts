import axios from 'axios';

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

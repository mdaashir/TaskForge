import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_PATHS } from './apiPaths.ts';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
    accessToken = token;
};

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

const axiosInstance = axios.create({ baseURL, withCredentials: true });

axiosInstance.interceptors.request.use((config) => {
    if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
    return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function requestNewAccessToken(): Promise<string | null> {
    try {
        const { data } = await axios.post<{ accessToken: string }>(
            `${baseURL}${API_PATHS.auth.refresh}`,
            {},
            { withCredentials: true }
        );
        accessToken = data.accessToken;
        return data.accessToken;
    } catch {
        accessToken = null;
        return null;
    }
}

axiosInstance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const original = error.config as RetriableConfig | undefined;
        const url = original?.url ?? '';
        const isAuthCall =
            url.includes(API_PATHS.auth.refresh) || url.includes(API_PATHS.auth.login);

        if (error.response?.status === 401 && original && !original._retry && !isAuthCall) {
            original._retry = true;
            refreshPromise =
                refreshPromise ??
                requestNewAccessToken().finally(() => {
                    refreshPromise = null;
                });
            const token = await refreshPromise;
            if (token) {
                original.headers.Authorization = `Bearer ${token}`;
                return axiosInstance(original);
            }
            setAccessToken(null);
            if (window.location.pathname !== '/login') window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;

import { useEffect, useState, type ReactNode } from 'react';
import type { AuthResponse, User } from '../types.ts';
import { API_PATHS } from '../utils/apiPaths.ts';
import axiosInstance, { setAccessToken } from '../utils/axiosInstance.ts';
import { AuthContext } from './authContext.ts';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const bootstrap = async () => {
            try {
                const { data } = await axiosInstance.post<{ accessToken: string }>(
                    API_PATHS.auth.refresh
                );
                setAccessToken(data.accessToken);
                const profile = await axiosInstance.get<{ user: User }>(API_PATHS.auth.profile);
                setUser(profile.data.user);
            } catch {
                setAccessToken(null);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };
        void bootstrap();
    }, []);

    const login = async (email: string, password: string) => {
        const { data } = await axiosInstance.post<AuthResponse>(API_PATHS.auth.login, {
            email,
            password,
        });
        setAccessToken(data.accessToken);
        setUser(data.user);
        return data.user;
    };

    const register = async (name: string, email: string, password: string) => {
        const { data } = await axiosInstance.post<AuthResponse>(API_PATHS.auth.register, {
            user: { name, email, password },
        });
        setAccessToken(data.accessToken);
        setUser(data.user);
        return data.user;
    };

    const logout = async () => {
        try {
            await axiosInstance.post(API_PATHS.auth.logout);
        } finally {
            setAccessToken(null);
            setUser(null);
        }
    };

    const logoutAll = async () => {
        try {
            await axiosInstance.post(API_PATHS.auth.logoutAll);
        } finally {
            setAccessToken(null);
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, logoutAll }}>
            {children}
        </AuthContext.Provider>
    );
};

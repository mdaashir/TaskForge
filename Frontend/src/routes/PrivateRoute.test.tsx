import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { AuthContextValue, MemberType } from '../types.ts';
import PrivateRoute from './PrivateRoute.tsx';

vi.mock('../context/useAuth.ts', () => ({
    useAuth: vi.fn(),
}));

import { useAuth } from '../context/useAuth.ts';

const mockedUseAuth = vi.mocked(useAuth);

const mockAuth = (value: Partial<AuthContextValue>) => {
    mockedUseAuth.mockReturnValue({
        user: null,
        loading: false,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        ...value,
    } as AuthContextValue);
};

const renderAt = (allowedRoles: MemberType[], path = '/secret') =>
    render(
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route element={<PrivateRoute allowedRoles={allowedRoles} />}>
                    <Route path="/secret" element={<div>Secret</div>} />
                </Route>
                <Route path="/login" element={<div>Login</div>} />
                <Route path="/admin/dashboard" element={<div>Admin home</div>} />
                <Route path="/user/dashboard" element={<div>User home</div>} />
                <Route path="/projects" element={<div>Projects</div>} />
            </Routes>
        </MemoryRouter>
    );

const user = (memberType: MemberType) =>
    ({ _id: 'u1', name: 'Test', email: 'test@example.com', memberType }) as AuthContextValue['user'];

describe('PrivateRoute', () => {
    it('shows a loading state while auth is resolving', () => {
        mockAuth({ loading: true });
        renderAt(['ADMIN']);

        expect(screen.getByText('Loading…')).toBeInTheDocument();
    });

    it('redirects an unauthenticated visitor to login', () => {
        mockAuth({ user: null });
        renderAt(['ADMIN']);

        expect(screen.getByText('Login')).toBeInTheDocument();
    });

    it('renders the route when the role is allowed', () => {
        mockAuth({ user: user('USER') });
        renderAt(['ADMIN', 'USER']);

        expect(screen.getByText('Secret')).toBeInTheDocument();
    });

    it('sends a user away from an admin-only route', () => {
        mockAuth({ user: user('USER') });
        renderAt(['ADMIN']);

        expect(screen.getByText('User home')).toBeInTheDocument();
        expect(screen.queryByText('Secret')).not.toBeInTheDocument();
    });

    it('sends a viewer to the projects page', () => {
        mockAuth({ user: user('VIEWER') });
        renderAt(['USER']);

        expect(screen.getByText('Projects')).toBeInTheDocument();
    });

    it('allows an admin into an admin-only route', () => {
        mockAuth({ user: user('ADMIN') });
        renderAt(['ADMIN']);

        expect(screen.getByText('Secret')).toBeInTheDocument();
    });
});

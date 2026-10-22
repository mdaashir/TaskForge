import { Suspense } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth.ts';
import NotificationBell from './NotificationBell.tsx';
import PageFallback from './PageFallback.tsx';

const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-2 text-sm font-medium ${
        isActive ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'
    }`;

const AppLayout = () => {
    const { user, logout, logoutAll } = useAuth();
    const navigate = useNavigate();

    const links =
        user?.memberType === 'ADMIN'
            ? [
                  { to: '/admin/dashboard', label: 'Dashboard' },
                  { to: '/projects', label: 'Projects' },
                  { to: '/workflows', label: 'Workflows' },
                  { to: '/admin/tasks', label: 'Tasks' },
                  { to: '/admin/users', label: 'Users' },
                  { to: '/admin/audit', label: 'Audit' },
              ]
            : [
                  { to: '/user/dashboard', label: 'Dashboard' },
                  { to: '/projects', label: 'Projects' },
                  { to: '/workflows', label: 'Workflows' },
                  { to: '/user/tasks', label: 'My Tasks' },
              ];

    const handleLogout = async () => {
        await logout();
        navigate('/login', { replace: true });
    };

    const handleLogoutAll = async () => {
        if (!window.confirm('Sign out of every device?')) return;
        await logoutAll();
        navigate('/login', { replace: true });
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-6 py-3">
                    <span className="text-lg font-semibold text-slate-800">TaskForge</span>
                    <nav className="flex flex-1 flex-wrap items-center gap-1">
                        {links.map((link) => (
                            <NavLink key={link.to} to={link.to} className={linkClass}>
                                {link.label}
                            </NavLink>
                        ))}
                    </nav>
                    <span className="text-sm text-slate-500">{user?.name}</span>
                    <NotificationBell />
                    <button
                        type="button"
                        onClick={handleLogoutAll}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600"
                    >
                        Sign out everywhere
                    </button>
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600"
                    >
                        Log out
                    </button>
                </div>
            </header>
            <main className="pb-10">
                <Suspense fallback={<PageFallback />}>
                    <Outlet />
                </Suspense>
            </main>
        </div>
    );
};

export default AppLayout;

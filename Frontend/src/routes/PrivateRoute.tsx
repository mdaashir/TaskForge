import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth.ts';
import type { PrivateRouteProps } from '../types.ts';
import { homeForRole } from '../utils/helper.ts';

const PrivateRoute = ({ allowedRoles }: PrivateRouteProps) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) return <div className="p-6 text-center text-slate-500">Loading…</div>;
    if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.memberType))
        return <Navigate to={homeForRole(user.memberType)} replace />;

    return <Outlet />;
};

export default PrivateRoute;

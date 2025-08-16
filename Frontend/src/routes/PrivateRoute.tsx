import { Outlet } from 'react-router-dom';
import type { PrivateRouteProps } from '../types';

const PrivateRoute = ({ allowedRoles }: PrivateRouteProps) => {
    console.log(allowedRoles);
    return <Outlet />;
};

export default PrivateRoute;

import { Suspense, lazy } from 'react';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/Layout.tsx';
import PageFallback from './components/PageFallback.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { useAuth } from './context/useAuth.ts';
import PrivateRoute from './routes/PrivateRoute.tsx';
import { homeForRole } from './utils/helper.ts';

const Login = lazy(() => import('./pages/Auth/Login.tsx'));
const SignUp = lazy(() => import('./pages/Auth/SignUp.tsx'));
const Dashboard = lazy(() => import('./pages/Admin/Dashboard.tsx'));
const ManageTasks = lazy(() => import('./pages/Admin/ManageTasks.tsx'));
const ManageUsers = lazy(() => import('./pages/Admin/ManageUsers.tsx'));
const ManageProjects = lazy(() => import('./pages/Projects/ManageProjects.tsx'));
const TaskForm = lazy(() => import('./pages/Tasks/TaskForm.tsx'));
const MyTasks = lazy(() => import('./pages/User/MyTasks.tsx'));
const UserDashboard = lazy(() => import('./pages/User/UserDashboard.tsx'));
const ViewTaskDetails = lazy(() => import('./pages/User/ViewTaskDetails.tsx'));

const HomeRedirect = () => {
    const { user } = useAuth();
    return <Navigate to={homeForRole(user?.memberType)} replace />;
};

const App = () => {
    return (
        <AuthProvider>
            <Router>
                <Toaster position="top-right" />
                <Suspense fallback={<PageFallback />}>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<SignUp />} />

                        {/* Any authenticated user */}
                        <Route
                            element={<PrivateRoute allowedRoles={['ADMIN', 'VIEWER', 'USER']} />}
                        >
                            <Route element={<AppLayout />}>
                                <Route path="/" element={<HomeRedirect />} />
                                <Route path="/projects" element={<ManageProjects />} />
                                <Route path="/tasks/edit/:id" element={<TaskForm />} />

                                {/* Admin only */}
                                <Route element={<PrivateRoute allowedRoles={['ADMIN']} />}>
                                    <Route path="/admin/dashboard" element={<Dashboard />} />
                                    <Route path="/admin/tasks" element={<ManageTasks />} />
                                    <Route path="/admin/tasks/create" element={<TaskForm />} />
                                    <Route path="/admin/users" element={<ManageUsers />} />
                                </Route>

                                {/* User only */}
                                <Route element={<PrivateRoute allowedRoles={['USER']} />}>
                                    <Route path="/user/dashboard" element={<UserDashboard />} />
                                    <Route path="/user/tasks" element={<MyTasks />} />
                                    <Route
                                        path="/user/tasks/details/:id"
                                        element={<ViewTaskDetails />}
                                    />
                                </Route>
                            </Route>
                        </Route>

                        <Route path="*" element={<Navigate to="/login" replace />} />
                    </Routes>
                </Suspense>
            </Router>
        </AuthProvider>
    );
};

export default App;

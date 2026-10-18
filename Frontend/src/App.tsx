import { Toaster } from 'react-hot-toast';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/Layout.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { useAuth } from './context/useAuth.ts';
import Dashboard from './pages/Admin/Dashboard.tsx';
import ManageTasks from './pages/Admin/ManageTasks.tsx';
import ManageUsers from './pages/Admin/ManageUsers.tsx';
import Login from './pages/Auth/Login.tsx';
import SignUp from './pages/Auth/SignUp.tsx';
import ManageProjects from './pages/Projects/ManageProjects.tsx';
import TaskForm from './pages/Tasks/TaskForm.tsx';
import MyTasks from './pages/User/MyTasks.tsx';
import UserDashboard from './pages/User/UserDashboard.tsx';
import ViewTaskDetails from './pages/User/ViewTaskDetails.tsx';
import PrivateRoute from './routes/PrivateRoute.tsx';
import { homeForRole } from './utils/helper.ts';

const HomeRedirect = () => {
    const { user } = useAuth();
    return <Navigate to={homeForRole(user?.memberType)} replace />;
};

const App = () => {
    return (
        <AuthProvider>
            <Router>
                <Toaster position="top-right" />
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<SignUp />} />

                    {/* Any authenticated user */}
                    <Route element={<PrivateRoute allowedRoles={['ADMIN', 'VIEWER', 'USER']} />}>
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
            </Router>
        </AuthProvider>
    );
};

export default App;

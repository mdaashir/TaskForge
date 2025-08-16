import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import CreateTask from './pages/Admin/CreateTask.tsx';
import Dashboard from './pages/Admin/Dashboard.tsx';
import ManageTasks from './pages/Admin/ManageTasks.tsx';
import ManageUsers from './pages/Admin/ManageUsers.tsx';
import Login from './pages/Auth/Login.tsx';
import SignUp from './pages/Auth/SignUp.tsx';
import MyTasks from './pages/User/MyTasks.tsx';
import UserDashboard from './pages/User/UserDashboard.tsx';
import ViewTaskDetails from './pages/User/ViewTaskDetails.tsx';
import PrivateRoute from './routes/PrivateRoute.tsx';

const App = () => {
    return (
        <div>
            <Router>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<SignUp />} />

                    {/* Admin Routes */}
                    <Route element={<PrivateRoute allowedRoles={['admin']} />}>
                        <Route path="/admin/dashboard" element={<Dashboard />} />
                        <Route path="/admin/tasks" element={<ManageTasks />} />
                        <Route path="/admin/tasks/create" element={<CreateTask />} />
                        <Route path="/admin/users" element={<ManageUsers />} />
                    </Route>

                    {/* User Routes */}
                    <Route element={<PrivateRoute allowedRoles={['user']} />}>
                        <Route path="/user/dashboard" element={<UserDashboard />} />
                        <Route path="/user/tasks" element={<MyTasks />} />
                        <Route path="/user/tasks/details/:id" element={<ViewTaskDetails />} />
                    </Route>
                </Routes>
            </Router>
        </div>
    );
};

export default App;

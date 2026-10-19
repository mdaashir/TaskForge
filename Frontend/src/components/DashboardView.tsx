import { useEffect, useState, type ComponentType } from 'react';
import toast from 'react-hot-toast';
import { FiAlertTriangle, FiCheckSquare, FiFolder, FiUserCheck, FiUsers } from 'react-icons/fi';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import type { DashboardResponse } from '../types.ts';
import { API_PATHS } from '../utils/apiPaths.ts';
import axiosInstance from '../utils/axiosInstance.ts';
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from '../utils/data.ts';
import { getErrorMessage, labelOf, relativeTime } from '../utils/helper.ts';

const StatCard = ({
    label,
    value,
    Icon,
}: {
    label: string;
    value: number;
    Icon: ComponentType<{ className?: string }>;
}) => (
    <div className="rounded-xl bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">{label}</span>
            <Icon className="text-primary" />
        </div>
        <p className="mt-2 text-2xl font-semibold text-slate-800">{value}</p>
    </div>
);

const projectName = (task: DashboardResponse['recentTasks'][number]) =>
    typeof task.projectId === 'string' ? task.projectId : task.projectId.name;

const DashboardView = ({ title }: { title: string }) => {
    const [data, setData] = useState<DashboardResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const response = await axiosInstance.get<DashboardResponse>(API_PATHS.dashboard);
                setData(response.data);
            } catch (error) {
                toast.error(getErrorMessage(error));
            } finally {
                setLoading(false);
            }
        };
        void load();
    }, []);

    if (loading) return <div className="p-6 text-center text-slate-500">Loading…</div>;
    if (!data) return <div className="p-6 text-center text-slate-500">Dashboard unavailable</div>;

    const chartData = data.tasksByStatus.map((entry) => ({
        name: labelOf(STATUS_OPTIONS, entry.status),
        count: entry.count,
    }));

    return (
        <div className="mx-auto max-w-6xl space-y-6 p-6">
            <h1 className="text-2xl font-semibold text-slate-800">{title}</h1>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {data.totals.users !== null && (
                    <StatCard label="Users" value={data.totals.users} Icon={FiUsers} />
                )}
                <StatCard label="Projects" value={data.totals.projects} Icon={FiFolder} />
                <StatCard label="Tasks" value={data.totals.tasks} Icon={FiCheckSquare} />
                <StatCard
                    label="Assigned to me"
                    value={data.totals.assignedToMe}
                    Icon={FiUserCheck}
                />
                <StatCard label="Overdue" value={data.totals.overdue} Icon={FiAlertTriangle} />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="rounded-xl bg-white p-5 shadow-sm lg:col-span-2">
                    <h2 className="mb-4 text-sm font-medium text-slate-600">Tasks by status</h2>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Bar dataKey="count" fill="#1368ec" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="rounded-xl bg-white p-5 shadow-sm">
                    <h2 className="mb-4 text-sm font-medium text-slate-600">Projects by status</h2>
                    <ul className="space-y-2 text-sm">
                        {data.projectsByStatus.map((entry) => (
                            <li key={entry.status} className="flex items-center justify-between">
                                <span className="text-slate-500">
                                    {labelOf(STATUS_OPTIONS, entry.status)}
                                </span>
                                <span className="font-medium text-slate-700">{entry.count}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                <h2 className="border-b border-slate-100 px-5 py-4 text-sm font-medium text-slate-600">
                    Recent tasks
                </h2>
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                        <tr>
                            <th className="px-5 py-3 font-medium">Title</th>
                            <th className="px-5 py-3 font-medium">Project</th>
                            <th className="px-5 py-3 font-medium">Status</th>
                            <th className="px-5 py-3 font-medium">Priority</th>
                            <th className="px-5 py-3 font-medium">Updated</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.recentTasks.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-5 py-6 text-center text-slate-400">
                                    No tasks yet
                                </td>
                            </tr>
                        ) : (
                            data.recentTasks.map((task) => (
                                <tr key={task._id} className="border-t border-slate-100">
                                    <td className="px-5 py-3 text-slate-700">{task.title}</td>
                                    <td className="px-5 py-3 text-slate-500">
                                        {projectName(task)}
                                    </td>
                                    <td className="px-5 py-3 text-slate-500">
                                        {labelOf(STATUS_OPTIONS, task.status)}
                                    </td>
                                    <td className="px-5 py-3 text-slate-500">
                                        {labelOf(PRIORITY_OPTIONS, task.priority)}
                                    </td>
                                    <td className="px-5 py-3 text-slate-500">
                                        {relativeTime(task.updatedAt)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DashboardView;

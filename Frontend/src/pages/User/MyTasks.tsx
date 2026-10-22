import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import type { Task, TaskListResponse } from '../../types.ts';
import { API_PATHS } from '../../utils/apiPaths.ts';
import axiosInstance from '../../utils/axiosInstance.ts';
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from '../../utils/data.ts';
import { getErrorMessage, labelOf } from '../../utils/helper.ts';

const projectName = (task: Task) =>
    typeof task.projectId === 'string' ? task.projectId : task.projectId.name;

const MyTasks = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [showArchived, setShowArchived] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const { data } = await axiosInstance.get<TaskListResponse>(API_PATHS.tasks.mine, {
                    params: { archived: showArchived ? 'archived' : undefined },
                });
                setTasks(data.tasks);
            } catch (error) {
                toast.error(getErrorMessage(error));
            } finally {
                setLoading(false);
            }
        };
        void load();
    }, [showArchived]);

    return (
        <div className="mx-auto max-w-5xl p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-semibold text-slate-800">My tasks</h1>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                        type="checkbox"
                        checked={showArchived}
                        onChange={(event) => setShowArchived(event.target.checked)}
                    />
                    Show archived
                </label>
            </div>

            <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                        <tr>
                            <th className="px-4 py-3 font-medium">Title</th>
                            <th className="px-4 py-3 font-medium">Project</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium">Priority</th>
                            <th className="px-4 py-3 font-medium">Due</th>
                            <th className="px-4 py-3 font-medium">Progress</th>
                            <th className="px-4 py-3 text-right font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                                    Loading…
                                </td>
                            </tr>
                        ) : tasks.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                                    No tasks assigned to you
                                </td>
                            </tr>
                        ) : (
                            tasks.map((task) => (
                                <tr key={task._id} className="border-t border-slate-100">
                                    <td className="px-4 py-3 text-slate-700">
                                        {task.title}
                                        {task.archived && (
                                            <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                                                Archived
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500">
                                        {projectName(task)}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500">
                                        {labelOf(STATUS_OPTIONS, task.status)}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500">
                                        {labelOf(PRIORITY_OPTIONS, task.priority)}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500">
                                        {task.dueDate ? task.dueDate.slice(0, 10) : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500">{task.progress}%</td>
                                    <td className="px-4 py-3 text-right">
                                        <Link
                                            to={`/user/tasks/details/${task._id}`}
                                            className="font-medium text-primary"
                                        >
                                            View
                                        </Link>
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

export default MyTasks;

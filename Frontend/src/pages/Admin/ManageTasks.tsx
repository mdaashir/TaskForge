import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import type { Project, ProjectListResponse, Task, TaskListResponse } from '../../types.ts';
import { API_PATHS } from '../../utils/apiPaths.ts';
import axiosInstance from '../../utils/axiosInstance.ts';
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from '../../utils/data.ts';
import { getErrorMessage, labelOf, refName } from '../../utils/helper.ts';

const LIMIT = 10;

const fieldClass =
    'rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary';

const projectName = (task: Task) =>
    typeof task.projectId === 'string' ? task.projectId : task.projectId.name;

const assigneeNames = (task: Task) =>
    (task.assignedTo ?? []).map((person) => refName(person)).join(', ') || '—';

const ManageTasks = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [projectId, setProjectId] = useState('');
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(false);

    const fetchTasks = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axiosInstance.get<TaskListResponse>(API_PATHS.tasks.list, {
                params: {
                    page,
                    limit: LIMIT,
                    search: search || undefined,
                    projectId: projectId || undefined,
                    status: status || undefined,
                },
            });
            setTasks(data.tasks);
            setTotal(data.total);
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    }, [page, search, projectId, status]);

    useEffect(() => {
        void fetchTasks();
    }, [fetchTasks]);

    useEffect(() => {
        const loadProjects = async () => {
            try {
                const { data } = await axiosInstance.get<ProjectListResponse>(
                    API_PATHS.projects.list,
                    { params: { limit: 100 } }
                );
                setProjects(data.projects);
            } catch {
                // the project filter just stays empty
            }
        };
        void loadProjects();
    }, []);

    const handleDelete = async (task: Task) => {
        if (!window.confirm(`Delete "${task.title}"?`)) return;
        try {
            await axiosInstance.delete(API_PATHS.tasks.byId(task._id));
            toast.success('Task deleted');
            await fetchTasks();
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    const totalPages = Math.max(1, Math.ceil(total / LIMIT));

    return (
        <div className="mx-auto max-w-6xl p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-semibold text-slate-800">Tasks</h1>
                <Link
                    to="/admin/tasks/create"
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
                >
                    New task
                </Link>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <input
                    type="search"
                    value={search}
                    onChange={(event) => {
                        setPage(1);
                        setSearch(event.target.value);
                    }}
                    placeholder="Search tasks"
                    className="w-56 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <select
                    value={projectId}
                    onChange={(event) => {
                        setPage(1);
                        setProjectId(event.target.value);
                    }}
                    className={fieldClass}
                >
                    <option value="">All projects</option>
                    {projects.map((project) => (
                        <option key={project._id} value={project._id}>
                            {project.name}
                        </option>
                    ))}
                </select>
                <select
                    value={status}
                    onChange={(event) => {
                        setPage(1);
                        setStatus(event.target.value);
                    }}
                    className={fieldClass}
                >
                    <option value="">All statuses</option>
                    {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                        <tr>
                            <th className="px-4 py-3 font-medium">Title</th>
                            <th className="px-4 py-3 font-medium">Project</th>
                            <th className="px-4 py-3 font-medium">Assignees</th>
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
                                <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                                    Loading…
                                </td>
                            </tr>
                        ) : tasks.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                                    No tasks found
                                </td>
                            </tr>
                        ) : (
                            tasks.map((task) => (
                                <tr key={task._id} className="border-t border-slate-100">
                                    <td className="px-4 py-3 text-slate-700">{task.title}</td>
                                    <td className="px-4 py-3 text-slate-500">
                                        {projectName(task)}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500">
                                        {assigneeNames(task)}
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
                                            to={`/tasks/edit/${task._id}`}
                                            className="mr-3 font-medium text-primary"
                                        >
                                            Edit
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(task)}
                                            className="font-medium text-red-600"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
                    <span>{total} task(s)</span>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            disabled={page <= 1}
                            onClick={() => setPage((previous) => previous - 1)}
                            className="rounded border border-slate-300 px-3 py-1 disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <span>
                            Page {page} of {totalPages}
                        </span>
                        <button
                            type="button"
                            disabled={page >= totalPages}
                            onClick={() => setPage((previous) => previous + 1)}
                            className="rounded border border-slate-300 px-3 py-1 disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManageTasks;

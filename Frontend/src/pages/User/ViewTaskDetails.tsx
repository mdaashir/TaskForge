import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useParams } from 'react-router-dom';
import Attachments from '../../components/Attachments.tsx';
import TaskComments from '../../components/TaskComments.tsx';
import { useAuth } from '../../context/useAuth.ts';
import type { Task } from '../../types.ts';
import { API_PATHS } from '../../utils/apiPaths.ts';
import axiosInstance from '../../utils/axiosInstance.ts';
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from '../../utils/data.ts';
import { getErrorMessage, labelOf, refId, refName } from '../../utils/helper.ts';

const ViewTaskDetails = () => {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const [task, setTask] = useState<Task | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        const load = async () => {
            try {
                const { data } = await axiosInstance.get<{ task: Task }>(API_PATHS.tasks.byId(id));
                setTask(data.task);
            } catch (error) {
                toast.error(getErrorMessage(error));
            } finally {
                setLoading(false);
            }
        };
        void load();
    }, [id]);

    if (loading) return <div className="p-6 text-center text-slate-500">Loading…</div>;
    if (!task) return <div className="p-6 text-center text-slate-500">Task not found</div>;

    const projectName =
        typeof task.projectId === 'string' ? task.projectId : task.projectId.name;
    const canEdit = user?.memberType === 'ADMIN' || refId(task.createdBy) === user?._id;

    const rows: { label: string; value: string }[] = [
        { label: 'Project', value: projectName },
        { label: 'Status', value: labelOf(STATUS_OPTIONS, task.status) },
        { label: 'Priority', value: labelOf(PRIORITY_OPTIONS, task.priority) },
        { label: 'Due date', value: task.dueDate ? task.dueDate.slice(0, 10) : '—' },
        { label: 'Assignees', value: (task.assignedTo ?? []).map((p) => refName(p)).join(', ') || '—' },
        { label: 'Created by', value: refName(task.createdBy) },
        { label: 'Progress', value: `${task.progress}%` },
    ];

    return (
        <div className="mx-auto max-w-3xl p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-semibold text-slate-800">{task.title}</h1>
                {canEdit && (
                    <Link
                        to={`/tasks/edit/${task._id}`}
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
                    >
                        Edit task
                    </Link>
                )}
            </div>

            <div className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
                {task.description && <p className="text-sm text-slate-600">{task.description}</p>}

                <dl className="grid gap-3 sm:grid-cols-2">
                    {rows.map((row) => (
                        <div key={row.label}>
                            <dt className="text-xs uppercase tracking-wide text-slate-400">
                                {row.label}
                            </dt>
                            <dd className="text-sm text-slate-700">{row.value}</dd>
                        </div>
                    ))}
                </dl>

                <div>
                    <h2 className="mb-2 text-sm font-medium text-slate-600">Checklist</h2>
                    {(task.todoChecklist ?? []).length === 0 ? (
                        <p className="text-sm text-slate-400">No checklist items</p>
                    ) : (
                        <ul className="space-y-1">
                            {(task.todoChecklist ?? []).map((item) => (
                                <li
                                    key={item._id ?? item.text}
                                    className="flex items-center gap-2 text-sm text-slate-600"
                                >
                                    <input type="checkbox" checked={item.completed} readOnly />
                                    <span className={item.completed ? 'line-through' : ''}>
                                        {item.text}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <Attachments kind="tasks" targetId={task._id} />

                <TaskComments taskId={task._id} />

                {!canEdit && (
                    <p className="text-xs text-slate-400">
                        Only the task's creator or an admin can edit it.
                    </p>
                )}
            </div>
        </div>
    );
};

export default ViewTaskDetails;

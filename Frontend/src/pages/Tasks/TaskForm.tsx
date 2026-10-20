import { useEffect, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import Attachments from '../../components/Attachments.tsx';
import { useAuth } from '../../context/useAuth.ts';
import type {
    Project,
    ProjectListResponse,
    Task,
    TaskInput,
    TaskPriority,
    TaskStatus,
    UserOption,
} from '../../types.ts';
import { API_PATHS } from '../../utils/apiPaths.ts';
import axiosInstance from '../../utils/axiosInstance.ts';
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from '../../utils/data.ts';
import { getErrorMessage, refId } from '../../utils/helper.ts';

const inputClass =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary';

interface ChecklistItem {
    text: string;
    completed: boolean;
}

interface FormState {
    projectId: string;
    title: string;
    description: string;
    priority: TaskPriority;
    status: TaskStatus;
    dueDate: string;
    assignedTo: string[];
    progress: number;
    todoChecklist: ChecklistItem[];
}

const emptyForm: FormState = {
    projectId: '',
    title: '',
    description: '',
    priority: 'Med',
    status: 'AS',
    dueDate: '',
    assignedTo: [],
    progress: 0,
    todoChecklist: [],
};

const TaskForm = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const editing = Boolean(id);

    const [projects, setProjects] = useState<Project[]>([]);
    const [form, setForm] = useState<FormState>(emptyForm);
    const [loading, setLoading] = useState(editing);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const loadProjects = async () => {
            try {
                const { data } = await axiosInstance.get<ProjectListResponse>(
                    API_PATHS.projects.list,
                    { params: { limit: 100 } }
                );
                setProjects(data.projects);
            } catch (error) {
                toast.error(getErrorMessage(error));
            }
        };
        void loadProjects();
    }, []);

    useEffect(() => {
        if (!id) return;
        const loadTask = async () => {
            try {
                const { data } = await axiosInstance.get<{ task: Task }>(API_PATHS.tasks.byId(id));
                const task = data.task;
                setForm({
                    projectId: refId(task.projectId),
                    title: task.title,
                    description: task.description ?? '',
                    priority: task.priority,
                    status: task.status,
                    dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
                    assignedTo: (task.assignedTo ?? []).map((person) => refId(person)),
                    progress: task.progress ?? 0,
                    todoChecklist: (task.todoChecklist ?? []).map((item) => ({
                        text: item.text,
                        completed: Boolean(item.completed),
                    })),
                });
            } catch (error) {
                toast.error(getErrorMessage(error));
            } finally {
                setLoading(false);
            }
        };
        void loadTask();
    }, [id]);

    const selectedProject = projects.find((project) => project._id === form.projectId);
    const assigneeOptions: UserOption[] = [];
    if (selectedProject) {
        const candidates = [selectedProject.owner, ...(selectedProject.members ?? [])];
        for (const candidate of candidates) {
            if (typeof candidate !== 'string' && candidate && !assigneeOptions.some((o) => o._id === candidate._id)) {
                assigneeOptions.push(candidate);
            }
        }
    }

    const toggleAssignee = (personId: string) => {
        setForm((previous) => ({
            ...previous,
            assignedTo: previous.assignedTo.includes(personId)
                ? previous.assignedTo.filter((value) => value !== personId)
                : [...previous.assignedTo, personId],
        }));
    };

    const updateChecklist = (index: number, patch: Partial<ChecklistItem>) => {
        setForm((previous) => ({
            ...previous,
            todoChecklist: previous.todoChecklist.map((item, position) =>
                position === index ? { ...item, ...patch } : item
            ),
        }));
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!form.projectId) {
            toast.error('Choose a project first');
            return;
        }
        setSaving(true);
        try {
            const payload: TaskInput = {
                title: form.title,
                description: form.description,
                priority: form.priority,
                status: form.status,
                assignedTo: form.assignedTo,
                progress: form.progress,
                todoChecklist: form.todoChecklist.filter((item) => item.text.trim() !== ''),
            };
            if (form.dueDate) payload.dueDate = form.dueDate;

            if (editing && id) {
                await axiosInstance.put(API_PATHS.tasks.byId(id), { task: payload });
                toast.success('Task updated');
            } else {
                await axiosInstance.post(API_PATHS.tasks.list, {
                    task: { ...payload, projectId: form.projectId },
                });
                toast.success('Task created');
            }
            navigate(user?.memberType === 'ADMIN' ? '/admin/tasks' : '/user/tasks');
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-6 text-center text-slate-500">Loading…</div>;

    return (
        <div className="mx-auto max-w-3xl p-6">
            <h1 className="mb-6 text-2xl font-semibold text-slate-800">
                {editing ? 'Edit task' : 'New task'}
            </h1>

            <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
                <div className="grid gap-4 sm:grid-cols-2">
                    <select
                        value={form.projectId}
                        disabled={editing}
                        onChange={(event) => setForm({ ...form, projectId: event.target.value })}
                        className={inputClass}
                    >
                        <option value="">Select project</option>
                        {projects.map((project) => (
                            <option key={project._id} value={project._id}>
                                {project.name}
                            </option>
                        ))}
                    </select>
                    <input
                        type="text"
                        required
                        value={form.title}
                        onChange={(event) => setForm({ ...form, title: event.target.value })}
                        placeholder="Task title"
                        className={inputClass}
                    />
                    <select
                        value={form.priority}
                        onChange={(event) =>
                            setForm({ ...form, priority: event.target.value as TaskPriority })
                        }
                        className={inputClass}
                    >
                        {PRIORITY_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <select
                        value={form.status}
                        onChange={(event) =>
                            setForm({ ...form, status: event.target.value as TaskStatus })
                        }
                        className={inputClass}
                    >
                        {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <input
                        type="date"
                        value={form.dueDate}
                        onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
                        className={inputClass}
                    />
                    <label className="text-sm text-slate-600">
                        Progress ({form.progress}%)
                        <input
                            type="range"
                            min={0}
                            max={100}
                            value={form.progress}
                            onChange={(event) =>
                                setForm({ ...form, progress: Number(event.target.value) })
                            }
                            className="w-full"
                        />
                    </label>
                </div>

                <textarea
                    value={form.description}
                    onChange={(event) => setForm({ ...form, description: event.target.value })}
                    placeholder="Description"
                    rows={2}
                    className={inputClass}
                />

                <div>
                    <span className="mb-1 block text-sm font-medium text-slate-600">Assignees</span>
                    {!selectedProject ? (
                        <span className="text-sm text-slate-400">Choose a project to see members</span>
                    ) : assigneeOptions.length === 0 ? (
                        <span className="text-sm text-slate-400">This project has no members</span>
                    ) : (
                        <div className="flex flex-wrap gap-x-4 gap-y-2">
                            {assigneeOptions.map((person) => (
                                <label
                                    key={person._id}
                                    className="flex items-center gap-1.5 text-sm text-slate-600"
                                >
                                    <input
                                        type="checkbox"
                                        checked={form.assignedTo.includes(person._id)}
                                        onChange={() => toggleAssignee(person._id)}
                                    />
                                    {person.name}
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                <div>
                    <div className="mb-1 flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-600">Checklist</span>
                        <button
                            type="button"
                            onClick={() =>
                                setForm((previous) => ({
                                    ...previous,
                                    todoChecklist: [
                                        ...previous.todoChecklist,
                                        { text: '', completed: false },
                                    ],
                                }))
                            }
                            className="text-sm font-medium text-primary"
                        >
                            Add item
                        </button>
                    </div>
                    <div className="space-y-2">
                        {form.todoChecklist.length === 0 ? (
                            <span className="text-sm text-slate-400">No checklist items</span>
                        ) : (
                            form.todoChecklist.map((item, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={item.completed}
                                        onChange={(event) =>
                                            updateChecklist(index, { completed: event.target.checked })
                                        }
                                    />
                                    <input
                                        type="text"
                                        value={item.text}
                                        onChange={(event) =>
                                            updateChecklist(index, { text: event.target.value })
                                        }
                                        placeholder="Checklist item"
                                        className={inputClass}
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setForm((previous) => ({
                                                ...previous,
                                                todoChecklist: previous.todoChecklist.filter(
                                                    (_, position) => position !== index
                                                ),
                                            }))
                                        }
                                        className="text-sm font-medium text-red-600"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {editing && id ? (
                    <Attachments kind="tasks" targetId={id} />
                ) : (
                    <p className="text-xs text-slate-400">
                        Save the task first to add attachments.
                    </p>
                )}

                <div className="flex items-center gap-3">
                    <button
                        type="submit"
                        disabled={saving}
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                    >
                        {saving ? 'Saving…' : editing ? 'Update task' : 'Create task'}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
};

export default TaskForm;

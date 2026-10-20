import { useCallback, useEffect, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import Attachments from '../../components/Attachments.tsx';
import { useAuth } from '../../context/useAuth.ts';
import type {
    Project,
    ProjectInput,
    ProjectListResponse,
    ProjectPriority,
    ProjectStatus,
    UserOption,
} from '../../types.ts';
import { API_PATHS } from '../../utils/apiPaths.ts';
import axiosInstance from '../../utils/axiosInstance.ts';
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from '../../utils/data.ts';
import { downloadFile } from '../../utils/download.ts';
import { getErrorMessage } from '../../utils/helper.ts';

const LIMIT = 10;

const inputClass =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary';

interface FormState {
    name: string;
    description: string;
    owner: string;
    members: string[];
    status: ProjectStatus;
    priority: ProjectPriority;
    startDate: string;
    endDate: string;
    progress: number;
}

const emptyForm: FormState = {
    name: '',
    description: '',
    owner: '',
    members: [],
    status: 'PE',
    priority: 'Med',
    startDate: '',
    endDate: '',
    progress: 0,
};

const refId = (value?: UserOption | string) =>
    !value ? '' : typeof value === 'string' ? value : value._id;

const refName = (value?: UserOption | string) =>
    !value ? '—' : typeof value === 'string' ? value : value.name;

const asDateInput = (value?: string) => (value ? value.slice(0, 10) : '');

const labelOf = (options: { value: string; label: string }[], value: string) =>
    options.find((option) => option.value === value)?.label ?? value;

const ManageProjects = () => {
    const { user } = useAuth();
    const isAdmin = user?.memberType === 'ADMIN';

    const [projects, setProjects] = useState<Project[]>([]);
    const [people, setPeople] = useState<UserOption[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<FormState>(emptyForm);

    const fetchProjects = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axiosInstance.get<ProjectListResponse>(
                API_PATHS.projects.list,
                { params: { page, limit: LIMIT, search: search || undefined } }
            );
            setProjects(data.projects);
            setTotal(data.total);
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    }, [page, search]);

    useEffect(() => {
        void fetchProjects();
    }, [fetchProjects]);

    useEffect(() => {
        const loadPeople = async () => {
            try {
                const { data } = await axiosInstance.get<{ users: UserOption[] }>(
                    API_PATHS.users.options
                );
                setPeople(data.users);
            } catch {
                setPeople([]);
            }
        };
        void loadPeople();
    }, []);

    const resetForm = () => {
        setEditingId(null);
        setForm({ ...emptyForm, owner: isAdmin ? '' : (user?._id ?? '') });
    };

    const toggleMember = (id: string) => {
        setForm((previous) => ({
            ...previous,
            members: previous.members.includes(id)
                ? previous.members.filter((member) => member !== id)
                : [...previous.members, id],
        }));
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSaving(true);
        try {
            const payload: ProjectInput = {
                name: form.name,
                description: form.description,
                members: form.members,
                status: form.status,
                priority: form.priority,
                progress: form.progress,
            };
            if (form.startDate) payload.startDate = form.startDate;
            if (form.endDate) payload.endDate = form.endDate;
            if (isAdmin && form.owner) payload.owner = form.owner;

            if (editingId) {
                await axiosInstance.put(API_PATHS.projects.byId(editingId), { project: payload });
                toast.success('Project updated');
            } else {
                await axiosInstance.post(API_PATHS.projects.list, { project: payload });
                toast.success('Project created');
            }
            resetForm();
            await fetchProjects();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (project: Project) => {
        setEditingId(project._id);
        setForm({
            name: project.name,
            description: project.description ?? '',
            owner: refId(project.owner),
            members: (project.members ?? []).map((member) => refId(member)),
            status: project.status,
            priority: project.priority,
            startDate: asDateInput(project.startDate),
            endDate: asDateInput(project.endDate),
            progress: project.progress ?? 0,
        });
    };

    const handleDelete = async (project: Project) => {
        if (!window.confirm(`Delete ${project.name}?`)) return;
        try {
            await axiosInstance.delete(API_PATHS.projects.byId(project._id));
            toast.success('Project deleted');
            if (editingId === project._id) resetForm();
            await fetchProjects();
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            await downloadFile(
                API_PATHS.reports.projects,
                { search: search || undefined },
                'projects.xlsx'
            );
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setExporting(false);
        }
    };

    const totalPages = Math.max(1, Math.ceil(total / LIMIT));

    return (
        <div className="mx-auto max-w-5xl p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-semibold text-slate-800">Projects</h1>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleExport}
                        disabled={exporting}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 disabled:opacity-60"
                    >
                        {exporting ? 'Exporting…' : 'Export'}
                    </button>
                    <input
                        type="search"
                        value={search}
                        onChange={(event) => {
                            setPage(1);
                            setSearch(event.target.value);
                        }}
                        placeholder="Search projects"
                        className="w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                </div>
            </div>

            <form onSubmit={handleSubmit} className="mb-8 space-y-4 rounded-xl bg-white p-6 shadow-sm">
                <h2 className="text-lg font-medium text-slate-700">
                    {editingId ? 'Edit project' : 'New project'}
                </h2>

                <div className="grid gap-4 sm:grid-cols-2">
                    <input
                        type="text"
                        required
                        value={form.name}
                        onChange={(event) => setForm({ ...form, name: event.target.value })}
                        placeholder="Project name"
                        className={inputClass}
                    />
                    {isAdmin ? (
                        <select
                            value={form.owner}
                            onChange={(event) => setForm({ ...form, owner: event.target.value })}
                            className={inputClass}
                        >
                            <option value="">Owner: me</option>
                            {people.map((person) => (
                                <option key={person._id} value={person._id}>
                                    {person.name}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <div className="flex items-center text-sm text-slate-500">
                            Owner: {user?.name}
                        </div>
                    )}
                    <select
                        value={form.status}
                        onChange={(event) =>
                            setForm({ ...form, status: event.target.value as ProjectStatus })
                        }
                        className={inputClass}
                    >
                        {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <select
                        value={form.priority}
                        onChange={(event) =>
                            setForm({ ...form, priority: event.target.value as ProjectPriority })
                        }
                        className={inputClass}
                    >
                        {PRIORITY_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <input
                        type="date"
                        value={form.startDate}
                        onChange={(event) => setForm({ ...form, startDate: event.target.value })}
                        className={inputClass}
                    />
                    <input
                        type="date"
                        value={form.endDate}
                        onChange={(event) => setForm({ ...form, endDate: event.target.value })}
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
                    <textarea
                        value={form.description}
                        onChange={(event) => setForm({ ...form, description: event.target.value })}
                        placeholder="Description"
                        rows={2}
                        className={inputClass}
                    />
                </div>

                <div>
                    <span className="mb-1 block text-sm font-medium text-slate-600">Members</span>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {people.length === 0 ? (
                            <span className="text-sm text-slate-400">No users available</span>
                        ) : (
                            people.map((person) => (
                                <label
                                    key={person._id}
                                    className="flex items-center gap-1.5 text-sm text-slate-600"
                                >
                                    <input
                                        type="checkbox"
                                        checked={form.members.includes(person._id)}
                                        onChange={() => toggleMember(person._id)}
                                    />
                                    {person.name}
                                </label>
                            ))
                        )}
                    </div>
                </div>

                {editingId ? (
                    <Attachments kind="projects" targetId={editingId} />
                ) : (
                    <p className="text-xs text-slate-400">
                        Save the project first to add attachments.
                    </p>
                )}

                <div className="flex items-center gap-3">
                    <button
                        type="submit"
                        disabled={saving}
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                    >
                        {saving ? 'Saving…' : editingId ? 'Update project' : 'Create project'}
                    </button>
                    {editingId && (
                        <button
                            type="button"
                            onClick={resetForm}
                            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </form>

            <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                        <tr>
                            <th className="px-4 py-3 font-medium">Name</th>
                            <th className="px-4 py-3 font-medium">Owner</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium">Priority</th>
                            <th className="px-4 py-3 font-medium">Members</th>
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
                        ) : projects.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                                    No projects found
                                </td>
                            </tr>
                        ) : (
                            projects.map((project) => (
                                <tr key={project._id} className="border-t border-slate-100">
                                    <td className="px-4 py-3 text-slate-700">{project.name}</td>
                                    <td className="px-4 py-3 text-slate-500">
                                        {refName(project.owner)}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500">
                                        {labelOf(STATUS_OPTIONS, project.status)}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500">
                                        {labelOf(PRIORITY_OPTIONS, project.priority)}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500">
                                        {project.members?.length ?? 0}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500">{project.progress}%</td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            type="button"
                                            onClick={() => handleEdit(project)}
                                            className="mr-3 font-medium text-primary"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(project)}
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
                    <span>{total} project(s)</span>
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

export default ManageProjects;

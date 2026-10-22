import { useCallback, useEffect, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/useAuth.ts';
import type {
    Project,
    ProjectStatus,
    UserOption,
    Workflow,
    WorkflowInput,
} from '../../types.ts';
import { API_PATHS } from '../../utils/apiPaths.ts';
import axiosInstance from '../../utils/axiosInstance.ts';
import { STATUS_OPTIONS } from '../../utils/data.ts';
import { getErrorMessage, refId, refName } from '../../utils/helper.ts';
import {
    createWorkflow,
    fetchWorkflows,
    parentIdOf,
    removeWorkflow,
    unavailableParentIds,
    updateWorkflow,
} from '../../utils/workflows.ts';

const LIMIT = 10;

const inputClass =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary';

interface FormState {
    name: string;
    description: string;
    parentId: string;
    owner: string;
    members: string[];
    project: string[];
    status: ProjectStatus;
}

const emptyForm: FormState = {
    name: '',
    description: '',
    parentId: '',
    owner: '',
    members: [],
    project: [],
    status: 'PE',
};

const toggle = (values: string[], id: string) =>
    values.includes(id) ? values.filter((value) => value !== id) : [...values, id];

const ManageWorkflows = () => {
    const { user } = useAuth();
    const isAdmin = user?.memberType === 'ADMIN';

    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [allWorkflows, setAllWorkflows] = useState<Workflow[]>([]);
    const [people, setPeople] = useState<UserOption[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<FormState>(emptyForm);

    const loadWorkflows = useCallback(async () => {
        setLoading(true);
        try {
            const [pageData, optionData] = await Promise.all([
                fetchWorkflows({ page, limit: LIMIT, search: search || undefined }),
                fetchWorkflows({ limit: 100 }),
            ]);
            setWorkflows(pageData.workflows);
            setTotal(pageData.total);
            setAllWorkflows(optionData.workflows);
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    }, [page, search]);

    useEffect(() => {
        void loadWorkflows();
    }, [loadWorkflows]);

    useEffect(() => {
        const loadOptions = async () => {
            try {
                const [peopleResponse, projectResponse] = await Promise.all([
                    axiosInstance.get<{ users: UserOption[] }>(API_PATHS.users.options),
                    axiosInstance.get<{ projects: Project[] }>(API_PATHS.projects.list, {
                        params: { limit: 100 },
                    }),
                ]);
                setPeople(peopleResponse.data.users);
                setProjects(projectResponse.data.projects);
            } catch {
                setPeople([]);
                setProjects([]);
            }
        };
        void loadOptions();
    }, []);

    const resetForm = () => {
        setEditingId(null);
        setForm({ ...emptyForm, owner: isAdmin ? '' : (user?._id ?? '') });
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSaving(true);
        try {
            const payload: WorkflowInput = {
                name: form.name,
                description: form.description,
                parentId: form.parentId || null,
                members: form.members,
                project: form.project,
                status: form.status,
            };
            if (isAdmin && form.owner) payload.owner = form.owner;

            if (editingId) {
                await updateWorkflow(editingId, payload);
                toast.success('Workflow updated');
            } else {
                await createWorkflow(payload);
                toast.success('Workflow created');
            }
            resetForm();
            await loadWorkflows();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (workflow: Workflow) => {
        setEditingId(workflow._id);
        setForm({
            name: workflow.name,
            description: workflow.description ?? '',
            parentId: parentIdOf(workflow) ?? '',
            owner: refId(workflow.owner),
            members: (workflow.members ?? []).map((member) => refId(member)),
            project: (workflow.project ?? []).map((project) => refId(project)),
            status: workflow.status,
        });
    };

    const handleDelete = async (workflow: Workflow) => {
        if (!window.confirm(`Delete ${workflow.name}?`)) return;
        try {
            await removeWorkflow(workflow._id);
            toast.success('Workflow deleted');
            if (editingId === workflow._id) resetForm();
            await loadWorkflows();
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    const blocked = editingId
        ? unavailableParentIds(allWorkflows, editingId)
        : new Set<string>();
    const parentOptions = allWorkflows.filter((workflow) => !blocked.has(workflow._id));
    const editing = editingId ? allWorkflows.find((item) => item._id === editingId) : undefined;
    const childCount = editing?.children?.length ?? 0;

    const totalPages = Math.max(1, Math.ceil(total / LIMIT));

    return (
        <div className="mx-auto max-w-6xl p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-semibold text-slate-800">Workflows</h1>
                <input
                    type="search"
                    value={search}
                    onChange={(event) => {
                        setPage(1);
                        setSearch(event.target.value);
                    }}
                    placeholder="Search workflows"
                    className="w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary"
                />
            </div>

            <form onSubmit={handleSubmit} className="mb-8 space-y-4 rounded-xl bg-white p-6 shadow-sm">
                <h2 className="text-lg font-medium text-slate-700">
                    {editingId ? 'Edit workflow' : 'New workflow'}
                </h2>

                <div className="grid gap-4 sm:grid-cols-2">
                    <input
                        type="text"
                        required
                        value={form.name}
                        onChange={(event) => setForm({ ...form, name: event.target.value })}
                        placeholder="Workflow name"
                        className={inputClass}
                    />
                    <select
                        value={form.parentId}
                        onChange={(event) => setForm({ ...form, parentId: event.target.value })}
                        className={inputClass}
                    >
                        <option value="">No parent (root)</option>
                        {parentOptions.map((workflow) => (
                            <option key={workflow._id} value={workflow._id}>
                                {workflow.name}
                            </option>
                        ))}
                    </select>
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
                    <textarea
                        value={form.description}
                        onChange={(event) => setForm({ ...form, description: event.target.value })}
                        placeholder="Description"
                        rows={2}
                        className={`${inputClass} sm:col-span-2`}
                    />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <span className="mb-1 block text-sm font-medium text-slate-600">
                            Members
                        </span>
                        <div className="flex max-h-32 flex-wrap gap-x-4 gap-y-2 overflow-y-auto">
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
                                            onChange={() =>
                                                setForm({
                                                    ...form,
                                                    members: toggle(form.members, person._id),
                                                })
                                            }
                                        />
                                        {person.name}
                                    </label>
                                ))
                            )}
                        </div>
                    </div>

                    <div>
                        <span className="mb-1 block text-sm font-medium text-slate-600">
                            Linked projects
                        </span>
                        <div className="flex max-h-32 flex-wrap gap-x-4 gap-y-2 overflow-y-auto">
                            {projects.length === 0 ? (
                                <span className="text-sm text-slate-400">No projects available</span>
                            ) : (
                                projects.map((project) => (
                                    <label
                                        key={project._id}
                                        className="flex items-center gap-1.5 text-sm text-slate-600"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={form.project.includes(project._id)}
                                            onChange={() =>
                                                setForm({
                                                    ...form,
                                                    project: toggle(form.project, project._id),
                                                })
                                            }
                                        />
                                        {project.name}
                                    </label>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {editingId && childCount > 0 && (
                    <p className="text-xs text-amber-600">
                        {childCount} sub-workflow{childCount === 1 ? '' : 's'} — delete or reparent
                        them before deleting this one.
                    </p>
                )}

                <div className="flex items-center gap-3">
                    <button
                        type="submit"
                        disabled={saving}
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                    >
                        {saving ? 'Saving…' : editingId ? 'Update workflow' : 'Create workflow'}
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

            <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                        <tr>
                            <th className="px-4 py-3 font-medium">Name</th>
                            <th className="px-4 py-3 font-medium">Parent</th>
                            <th className="px-4 py-3 font-medium">Owner</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium">Projects</th>
                            <th className="px-4 py-3 font-medium">Members</th>
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
                        ) : workflows.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                                    No workflows found
                                </td>
                            </tr>
                        ) : (
                            workflows.map((workflow) => (
                                <tr key={workflow._id} className="border-t border-slate-100">
                                    <td className="px-4 py-3 text-slate-700">{workflow.name}</td>
                                    <td className="px-4 py-3 text-slate-500">
                                        {workflow.parentId ? refName(workflow.parentId) : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500">
                                        {refName(workflow.owner)}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500">
                                        {STATUS_OPTIONS.find(
                                            (option) => option.value === workflow.status
                                        )?.label ?? workflow.status}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500">
                                        {workflow.project?.length ?? 0}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500">
                                        {workflow.members?.length ?? 0}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500">{workflow.progress}%</td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            type="button"
                                            onClick={() => handleEdit(workflow)}
                                            className="mr-3 font-medium text-primary"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(workflow)}
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
                    <span>{total} workflow(s)</span>
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

export default ManageWorkflows;

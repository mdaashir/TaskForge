import { useCallback, useEffect, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import type { MemberType, User, UserListResponse } from '../../types.ts';
import { API_PATHS } from '../../utils/apiPaths.ts';
import axiosInstance from '../../utils/axiosInstance.ts';
import { MEMBER_TYPE_OPTIONS, ROLE_OPTIONS, STATE_OPTIONS } from '../../utils/data.ts';
import { getErrorMessage } from '../../utils/helper.ts';

const LIMIT = 10;

interface FormState {
    name: string;
    email: string;
    password: string;
    memberType: MemberType;
    roles: string[];
    state: string;
}

const emptyForm: FormState = {
    name: '',
    email: '',
    password: '',
    memberType: 'USER',
    roles: [],
    state: 'A',
};

const inputClass =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary';

const stateLabel = (state?: string) =>
    STATE_OPTIONS.find((option) => option.value === state)?.label ?? 'Active';

const ManageUsers = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<FormState>(emptyForm);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axiosInstance.get<UserListResponse>(API_PATHS.users.list, {
                params: { page, limit: LIMIT, search: search || undefined },
            });
            setUsers(data.users);
            setTotal(data.total);
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    }, [page, search]);

    useEffect(() => {
        void fetchUsers();
    }, [fetchUsers]);

    const resetForm = () => {
        setEditingId(null);
        setForm(emptyForm);
    };

    const toggleRole = (value: string) => {
        setForm((prev) => ({
            ...prev,
            roles: prev.roles.includes(value)
                ? prev.roles.filter((role) => role !== value)
                : [...prev.roles, value],
        }));
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSaving(true);
        try {
            if (editingId) {
                const payload: Record<string, unknown> = {
                    name: form.name,
                    email: form.email,
                    memberType: form.memberType,
                    roles: form.roles,
                    state: form.state,
                };
                if (form.password) payload.password = form.password;
                await axiosInstance.put(API_PATHS.users.byId(editingId), { user: payload });
                toast.success('User updated');
            } else {
                await axiosInstance.post(API_PATHS.users.list, { user: form });
                toast.success('User created');
            }
            resetForm();
            await fetchUsers();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (user: User) => {
        setEditingId(user._id);
        setForm({
            name: user.name,
            email: user.email,
            password: '',
            memberType: user.memberType,
            roles: user.roles ?? [],
            state: user.state ?? 'A',
        });
    };

    const handleDelete = async (user: User) => {
        if (!window.confirm(`Delete ${user.name}?`)) return;
        try {
            await axiosInstance.delete(API_PATHS.users.byId(user._id));
            toast.success('User deleted');
            if (editingId === user._id) resetForm();
            await fetchUsers();
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    const totalPages = Math.max(1, Math.ceil(total / LIMIT));

    return (
        <div className="mx-auto max-w-5xl p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-semibold text-slate-800">Manage users</h1>
                <input
                    type="search"
                    value={search}
                    onChange={(event) => {
                        setPage(1);
                        setSearch(event.target.value);
                    }}
                    placeholder="Search name or email"
                    className="w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary"
                />
            </div>

            <form onSubmit={handleSubmit} className="mb-8 space-y-4 rounded-xl bg-white p-6 shadow-sm">
                <h2 className="text-lg font-medium text-slate-700">
                    {editingId ? 'Edit user' : 'New user'}
                </h2>

                <div className="grid gap-4 sm:grid-cols-2">
                    <input
                        type="text"
                        required
                        value={form.name}
                        onChange={(event) => setForm({ ...form, name: event.target.value })}
                        placeholder="Full name"
                        className={inputClass}
                    />
                    <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(event) => setForm({ ...form, email: event.target.value })}
                        placeholder="Email"
                        className={inputClass}
                    />
                    <input
                        type="password"
                        required={!editingId}
                        value={form.password}
                        onChange={(event) => setForm({ ...form, password: event.target.value })}
                        placeholder={editingId ? 'New password (optional)' : 'Password'}
                        className={inputClass}
                    />
                    <select
                        value={form.memberType}
                        onChange={(event) =>
                            setForm({ ...form, memberType: event.target.value as MemberType })
                        }
                        className={inputClass}
                    >
                        {MEMBER_TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <span className="mb-1 block text-sm font-medium text-slate-600">Roles</span>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {ROLE_OPTIONS.map((role) => (
                            <label
                                key={role.value}
                                className="flex items-center gap-1.5 text-sm text-slate-600"
                            >
                                <input
                                    type="checkbox"
                                    checked={form.roles.includes(role.value)}
                                    onChange={() => toggleRole(role.value)}
                                />
                                {role.label}
                            </label>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <select
                        value={form.state}
                        onChange={(event) => setForm({ ...form, state: event.target.value })}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary"
                    >
                        {STATE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <button
                        type="submit"
                        disabled={saving}
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                    >
                        {saving ? 'Saving…' : editingId ? 'Update user' : 'Create user'}
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
                            <th className="px-4 py-3 font-medium">Email</th>
                            <th className="px-4 py-3 font-medium">Member type</th>
                            <th className="px-4 py-3 font-medium">State</th>
                            <th className="px-4 py-3 text-right font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                                    Loading…
                                </td>
                            </tr>
                        ) : users.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                                    No users found
                                </td>
                            </tr>
                        ) : (
                            users.map((user) => (
                                <tr key={user._id} className="border-t border-slate-100">
                                    <td className="px-4 py-3 text-slate-700">{user.name}</td>
                                    <td className="px-4 py-3 text-slate-500">{user.email}</td>
                                    <td className="px-4 py-3 text-slate-500">{user.memberType}</td>
                                    <td className="px-4 py-3 text-slate-500">
                                        {stateLabel(user.state)}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            type="button"
                                            onClick={() => handleEdit(user)}
                                            className="mr-3 font-medium text-primary"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(user)}
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
                    <span>{total} user(s)</span>
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

export default ManageUsers;

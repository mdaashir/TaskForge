import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import type { AuditEntry } from '../../types.ts';
import { fetchAuditEntries } from '../../utils/audit.ts';
import { getErrorMessage, refName, relativeTime } from '../../utils/helper.ts';

const LIMIT = 20;

const ENTITY_OPTIONS = ['User', 'Project', 'Task', 'Comment', 'File', 'Workflow'];

const ACTION_OPTIONS = [
    { value: 'CREATE', label: 'Create' },
    { value: 'UPDATE', label: 'Update' },
    { value: 'DELETE', label: 'Delete' },
    { value: 'ARCHIVE', label: 'Archive' },
    { value: 'RESTORE', label: 'Restore' },
];

const selectClass =
    'rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary';

const actionLabel = (action: string) =>
    ACTION_OPTIONS.find((option) => option.value === action)?.label ?? action;

const changedFields = (entry: AuditEntry): string => {
    const fields = entry.newData
        ? Object.keys(entry.newData)
        : entry.oldData
          ? Object.keys(entry.oldData)
          : [];
    return fields.length ? fields.join(', ') : '—';
};

const AuditLogPage = () => {
    const [entries, setEntries] = useState<AuditEntry[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [entity, setEntity] = useState('');
    const [action, setAction] = useState('');
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchAuditEntries({
                page,
                limit: LIMIT,
                entity: entity || undefined,
                action: action || undefined,
            });
            setEntries(data.entries);
            setTotal(data.total);
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    }, [page, entity, action]);

    useEffect(() => {
        void load();
    }, [load]);

    const totalPages = Math.max(1, Math.ceil(total / LIMIT));

    return (
        <div className="mx-auto max-w-6xl p-6">
            <h1 className="mb-6 text-2xl font-semibold text-slate-800">Audit log</h1>

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <select
                    value={entity}
                    onChange={(event) => {
                        setPage(1);
                        setEntity(event.target.value);
                    }}
                    className={selectClass}
                >
                    <option value="">All entities</option>
                    {ENTITY_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                            {option}
                        </option>
                    ))}
                </select>
                <select
                    value={action}
                    onChange={(event) => {
                        setPage(1);
                        setAction(event.target.value);
                    }}
                    className={selectClass}
                >
                    <option value="">All actions</option>
                    {ACTION_OPTIONS.map((option) => (
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
                            <th className="px-4 py-3 font-medium">When</th>
                            <th className="px-4 py-3 font-medium">Actor</th>
                            <th className="px-4 py-3 font-medium">Action</th>
                            <th className="px-4 py-3 font-medium">Entity</th>
                            <th className="px-4 py-3 font-medium">Changed</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                                    Loading…
                                </td>
                            </tr>
                        ) : entries.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                                    No audit entries
                                </td>
                            </tr>
                        ) : (
                            entries.map((entry) => (
                                <tr key={entry._id} className="border-t border-slate-100">
                                    <td className="px-4 py-3 text-slate-500">
                                        {relativeTime(entry.createdAt)}
                                    </td>
                                    <td className="px-4 py-3 text-slate-700">
                                        {refName(entry.userId)}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500">
                                        {actionLabel(entry.action)}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500">{entry.entity}</td>
                                    <td className="px-4 py-3 text-slate-500">
                                        {changedFields(entry)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
                    <span>{total} entr{total === 1 ? 'y' : 'ies'}</span>
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

export default AuditLogPage;

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiPaperclip, FiTrash2 } from 'react-icons/fi';
import { useAuth } from '../context/useAuth.ts';
import type { FileAttachment, TaskComment } from '../types.ts';
import { API_PATHS } from '../utils/apiPaths.ts';
import { deleteAttachment, uploadAttachment } from '../utils/attachments.ts';
import {
    createTaskComment,
    deleteTaskComment,
    fetchTaskComments,
    updateTaskComment,
} from '../utils/comments.ts';
import { downloadFile } from '../utils/download.ts';
import { formatFileSize, getErrorMessage, refId, refName, relativeTime } from '../utils/helper.ts';

const textareaClass =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary';

const TaskComments = ({ taskId }: { taskId: string }) => {
    const { user } = useAuth();
    const [comments, setComments] = useState<TaskComment[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [attaching, setAttaching] = useState<string | null>(null);
    const [draft, setDraft] = useState('');
    const [replyTo, setReplyTo] = useState<string | null>(null);
    const [replyDraft, setReplyDraft] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDraft, setEditDraft] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setComments(await fetchTaskComments(taskId));
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    }, [taskId]);

    useEffect(() => {
        void load();
    }, [load]);

    const post = async (text: string, parentId?: string) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        setBusy(true);
        try {
            await createTaskComment(taskId, trimmed, parentId);
            if (parentId) {
                setReplyTo(null);
                setReplyDraft('');
            } else {
                setDraft('');
            }
            await load();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setBusy(false);
        }
    };

    const saveEdit = async (commentId: string) => {
        const trimmed = editDraft.trim();
        if (!trimmed) return;
        try {
            await updateTaskComment(commentId, trimmed);
            setEditingId(null);
            setEditDraft('');
            await load();
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    const remove = async (commentId: string) => {
        if (!window.confirm('Delete this comment?')) return;
        try {
            await deleteTaskComment(commentId);
            toast.success('Comment deleted');
            await load();
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    const attach = async (commentId: string, file: File) => {
        setAttaching(commentId);
        try {
            await uploadAttachment('comments', commentId, file);
            toast.success('Attachment added');
            await load();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setAttaching(null);
        }
    };

    const download = async (file: FileAttachment) => {
        try {
            await downloadFile(API_PATHS.files.byId(file._id), {}, file.originalName);
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    const removeAttachment = async (file: FileAttachment) => {
        if (!window.confirm(`Delete "${file.originalName}"?`)) return;
        try {
            await deleteAttachment(file._id);
            toast.success('Attachment deleted');
            await load();
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    const canDeleteAttachment = (file: FileAttachment) =>
        user?.memberType === 'ADMIN' || refId(file.uploadedBy) === user?._id;

    const canModify = (comment: TaskComment) =>
        user?.memberType === 'ADMIN' || refId(comment.createdBy) === user?._id;

    const renderComment = (comment: TaskComment, isReply: boolean) => (
        <div
            key={comment._id}
            className={isReply ? 'mt-3 border-l-2 border-slate-100 pl-3' : ''}
        >
            <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-slate-500">
                    <span className="font-medium text-slate-700">{refName(comment.createdBy)}</span>
                    <span className="ml-2">{relativeTime(comment.createdAt)}</span>
                    {comment.updatedAt && comment.updatedAt !== comment.createdAt && (
                        <span className="ml-1 italic">(edited)</span>
                    )}
                </div>
                <div className="flex items-center gap-2 text-xs">
                    {!isReply && (
                        <button
                            type="button"
                            onClick={() => {
                                setReplyTo(comment._id);
                                setReplyDraft('');
                            }}
                            className="font-medium text-primary"
                        >
                            Reply
                        </button>
                    )}
                    {canModify(comment) && (
                        <button
                            type="button"
                            onClick={() => {
                                setEditingId(comment._id);
                                setEditDraft(comment.text);
                            }}
                            className="font-medium text-slate-500"
                        >
                            Edit
                        </button>
                    )}
                    {canModify(comment) && (
                        <button
                            type="button"
                            onClick={() => remove(comment._id)}
                            className="font-medium text-red-600"
                        >
                            Delete
                        </button>
                    )}
                </div>
            </div>

            {editingId === comment._id ? (
                <div className="mt-2 space-y-2">
                    <textarea
                        value={editDraft}
                        onChange={(event) => setEditDraft(event.target.value)}
                        rows={2}
                        className={textareaClass}
                    />
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => saveEdit(comment._id)}
                            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white"
                        >
                            Save
                        </button>
                        <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{comment.text}</p>
            )}

            {comment.attachments && comment.attachments.length > 0 && (
                <ul className="mt-2 space-y-1">
                    {comment.attachments.map((file) => (
                        <li
                            key={file._id}
                            className="flex items-center justify-between gap-2 text-xs"
                        >
                            <button
                                type="button"
                                onClick={() => download(file)}
                                className="truncate text-primary"
                                title="Download"
                            >
                                {file.originalName}
                            </button>
                            <span className="flex items-center gap-2 text-slate-400">
                                {formatFileSize(file.size)}
                                {canDeleteAttachment(file) && (
                                    <button
                                        type="button"
                                        onClick={() => removeAttachment(file)}
                                        className="text-red-600"
                                        title="Delete"
                                    >
                                        <FiTrash2 />
                                    </button>
                                )}
                            </span>
                        </li>
                    ))}
                </ul>
            )}

            <label className="mt-1 inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-primary">
                <FiPaperclip />
                {attaching === comment._id ? 'Attaching…' : 'Attach'}
                <input
                    type="file"
                    className="hidden"
                    disabled={attaching === comment._id}
                    onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void attach(comment._id, file);
                        event.target.value = '';
                    }}
                />
            </label>

            {replyTo === comment._id && (
                <div className="mt-2 space-y-2">
                    <textarea
                        value={replyDraft}
                        onChange={(event) => setReplyDraft(event.target.value)}
                        rows={2}
                        placeholder="Write a reply…"
                        className={textareaClass}
                    />
                    <div className="flex gap-2">
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => post(replyDraft, comment._id)}
                            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
                        >
                            Reply
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setReplyTo(null);
                                setReplyDraft('');
                            }}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {comment.replies.map((reply) => renderComment(reply, true))}
        </div>
    );

    const total = comments.reduce((sum, comment) => sum + 1 + comment.replies.length, 0);

    return (
        <div>
            <h2 className="mb-2 text-sm font-medium text-slate-600">Comments ({total})</h2>

            <div className="space-y-2">
                <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    rows={2}
                    placeholder="Write a comment…"
                    className={textareaClass}
                />
                <button
                    type="button"
                    disabled={busy || !draft.trim()}
                    onClick={() => post(draft)}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                    {busy ? 'Posting…' : 'Post comment'}
                </button>
            </div>

            <div className="mt-4 space-y-4">
                {loading ? (
                    <p className="text-sm text-slate-400">Loading…</p>
                ) : comments.length === 0 ? (
                    <p className="text-sm text-slate-400">No comments yet</p>
                ) : (
                    comments.map((comment) => renderComment(comment, false))
                )}
            </div>
        </div>
    );
};

export default TaskComments;

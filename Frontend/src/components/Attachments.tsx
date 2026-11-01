import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import toast from 'react-hot-toast';
import { FiDownload, FiPaperclip, FiTrash2, FiUpload } from 'react-icons/fi';
import { useAuth } from '../context/useAuth.ts';
import type { FileAttachment } from '../types.ts';
import { API_PATHS } from '../utils/apiPaths.ts';
import {
    deleteAttachment,
    fetchAttachments,
    uploadAttachment,
    type AttachmentKind,
} from '../utils/attachments.ts';
import { downloadFile } from '../utils/download.ts';
import { formatFileSize, getErrorMessage, refId } from '../utils/helper.ts';

interface Props {
    kind: AttachmentKind;
    targetId: string;
}

const Attachments = ({ kind, targetId }: Props) => {
    const { user } = useAuth();
    const inputRef = useRef<HTMLInputElement>(null);
    const [files, setFiles] = useState<FileAttachment[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setFiles(await fetchAttachments(kind, targetId));
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    }, [kind, targetId]);

    useEffect(() => {
        void load();
    }, [load]);

    const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setBusy(true);
        try {
            await uploadAttachment(kind, targetId, file);
            toast.success('Attachment uploaded');
            await load();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setBusy(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    const handleDownload = async (file: FileAttachment) => {
        try {
            await downloadFile(API_PATHS.files.byId(file._id), {}, file.originalName);
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    const handleDelete = async (file: FileAttachment) => {
        if (!window.confirm(`Delete "${file.originalName}"?`)) return;
        try {
            await deleteAttachment(file._id);
            toast.success('Attachment deleted');
            await load();
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    const canDelete = (file: FileAttachment) =>
        user?.memberType === 'ADMIN' || refId(file.uploadedBy) === user?._id;

    return (
        <div>
            <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
                    <FiPaperclip /> Attachments
                </span>
                <label className="flex cursor-pointer items-center gap-1 text-sm font-medium text-primary">
                    <FiUpload /> {busy ? 'Uploading…' : 'Upload'}
                    <input
                        ref={inputRef}
                        type="file"
                        className="hidden"
                        onChange={handleUpload}
                        disabled={busy}
                    />
                </label>
            </div>

            {loading ? (
                <p className="text-sm text-slate-400">Loading…</p>
            ) : files.length === 0 ? (
                <p className="text-sm text-slate-400">No attachments</p>
            ) : (
                <ul className="space-y-1">
                    {files.map((file) => (
                        <li
                            key={file._id}
                            className="flex items-center justify-between gap-3 text-sm"
                        >
                            <span className="truncate text-slate-700">{file.originalName}</span>
                            <span className="flex items-center gap-2">
                                <span className="text-xs text-slate-400">
                                    {formatFileSize(file.size)}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => handleDownload(file)}
                                    className="text-primary"
                                    title="Download"
                                >
                                    <FiDownload />
                                </button>
                                {canDelete(file) && (
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(file)}
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
        </div>
    );
};

export default Attachments;

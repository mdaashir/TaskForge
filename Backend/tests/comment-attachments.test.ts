import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
    api,
    auth,
    clearDb,
    connectDb,
    createProject,
    createTask,
    disconnectDb,
    promote,
    register,
} from './helpers.ts';

beforeAll(connectDb);
beforeEach(clearDb);
afterAll(disconnectDb);

const PDF = Buffer.from('%PDF-1.4\nComment attachment test\n%%EOF\n');

const upload = (
    commentId: string,
    token: string,
    options: { content?: Buffer; filename?: string; contentType?: string } = {}
) => {
    const {
        content = PDF,
        filename = 'note.pdf',
        contentType = 'application/pdf',
    } = options;

    return api()
        .post(`/api/files/comments/${commentId}`)
        .set(auth(token))
        .attach('file', content, { filename, contentType });
};

const addComment = async (token: string, taskId: string, text: string, parentId?: string) => {
    const response = await api()
        .post(`/api/comments/tasks/${taskId}`)
        .set(auth(token))
        .send({ comment: { text, parentId } });

    return response.body.comment as { _id: string };
};

const thread = async (token: string, taskId: string) => {
    const response = await api().get(`/api/comments/tasks/${taskId}`).set(auth(token));
    return response.body.comments as {
        _id: string;
        attachments: { _id: string; originalName: string }[];
        replies: { _id: string; attachments: { _id: string }[] }[];
    }[];
};

describe('comment attachments', () => {
    it('round-trips a comment attachment and exposes it in the thread', async () => {
        const owner = await register('Owner');
        const member = await register('Member');
        const project = await createProject(owner.token, [member.id]);
        const task = await createTask(owner.token, project._id);
        const comment = await addComment(member.token, task._id, 'See attached');

        const uploaded = await upload(comment._id, member.token);
        expect(uploaded.status).toBe(201);
        expect(uploaded.body.file.originalName).toBe('note.pdf');
        const fileId = uploaded.body.file._id;

        const comments = await thread(owner.token, task._id);
        expect(comments).toHaveLength(1);
        expect(comments[0].attachments).toHaveLength(1);
        expect(comments[0].attachments[0]._id).toBe(fileId);
        expect(comments[0].attachments[0].originalName).toBe('note.pdf');

        const listed = await api()
            .get(`/api/files/comments/${comment._id}`)
            .set(auth(owner.token));
        expect(listed.status).toBe(200);
        expect(listed.body.files.map((file: { _id: string }) => file._id)).toEqual([fileId]);

        const downloaded = await api().get(`/api/files/${fileId}`).set(auth(owner.token));
        expect(downloaded.status).toBe(200);
        expect(Buffer.compare(downloaded.body as Buffer, PDF)).toBe(0);

        await api().delete(`/api/files/${fileId}`).set(auth(member.token)).expect(200);

        const after = await thread(owner.token, task._id);
        expect(after[0].attachments).toHaveLength(0);
    });

    it('keeps comment files out of the task and project attachment lists', async () => {
        const owner = await register('Owner');
        const project = await createProject(owner.token);
        const task = await createTask(owner.token, project._id);
        const comment = await addComment(owner.token, task._id, 'with a file');

        const uploaded = await upload(comment._id, owner.token);
        const fileId = uploaded.body.file._id;

        const taskFiles = await api().get(`/api/files/tasks/${task._id}`).set(auth(owner.token));
        expect(taskFiles.body.files.map((file: { _id: string }) => file._id)).not.toContain(fileId);

        const projectFiles = await api()
            .get(`/api/files/projects/${project._id}`)
            .set(auth(owner.token));
        expect(projectFiles.body.files.map((file: { _id: string }) => file._id)).not.toContain(
            fileId
        );
    });

    it('refuses a non-member on upload, list and download', async () => {
        const owner = await register('Owner');
        const outsider = await register('Outsider');
        const project = await createProject(owner.token);
        const task = await createTask(owner.token, project._id);
        const comment = await addComment(owner.token, task._id, 'private');

        const uploaded = await upload(comment._id, owner.token);
        const fileId = uploaded.body.file._id;

        expect((await upload(comment._id, outsider.token)).status).toBe(403);
        expect(
            (await api().get(`/api/files/comments/${comment._id}`).set(auth(outsider.token))).status
        ).toBe(403);
        expect((await api().get(`/api/files/${fileId}`).set(auth(outsider.token))).status).toBe(
            403
        );
    });

    it('only lets the uploader or an admin delete a comment attachment', async () => {
        const owner = await register('Owner');
        const member = await register('Member');
        const adminAccount = await register('Admin');
        const adminToken = await promote(adminAccount.email);

        const project = await createProject(owner.token, [member.id]);
        const task = await createTask(owner.token, project._id);
        const comment = await addComment(member.token, task._id, 'files');

        const first = await upload(comment._id, member.token);
        const firstId = first.body.file._id;

        expect((await api().delete(`/api/files/${firstId}`).set(auth(owner.token))).status).toBe(
            403
        );
        expect((await api().delete(`/api/files/${firstId}`).set(auth(member.token))).status).toBe(
            200
        );

        const second = await upload(comment._id, member.token);
        expect(
            (await api().delete(`/api/files/${second.body.file._id}`).set(auth(adminToken))).status
        ).toBe(200);
    });

    it('cascades attachments when a comment is deleted', async () => {
        const owner = await register('Owner');
        const project = await createProject(owner.token);
        const task = await createTask(owner.token, project._id);

        const root = await addComment(owner.token, task._id, 'root');
        const reply = await addComment(owner.token, task._id, 'reply', root._id);

        const rootFile = await upload(root._id, owner.token);
        const replyFile = await upload(reply._id, owner.token);

        await api().delete(`/api/comments/${root._id}`).set(auth(owner.token)).expect(200);

        expect(
            (await api().get(`/api/files/comments/${root._id}`).set(auth(owner.token))).status
        ).toBe(404);
        expect(
            (await api().get(`/api/files/${rootFile.body.file._id}`).set(auth(owner.token))).status
        ).toBe(404);
        expect(
            (await api()
                .get(`/api/files/${replyFile.body.file._id}`)
                .set(auth(owner.token))).status
        ).toBe(404);
    });

    it('applies the upload guardrails to comment files', async () => {
        const owner = await register('Owner');
        const project = await createProject(owner.token);
        const task = await createTask(owner.token, project._id);
        const comment = await addComment(owner.token, task._id, 'guarded');

        const response = await upload(comment._id, owner.token, {
            content: Buffer.from('MZ'),
            filename: 'malware.exe',
            contentType: 'application/x-msdownload',
        });

        expect(response.status).toBe(400);
        expect(response.body.message).toMatch(/Unsupported file type/i);
    });
});

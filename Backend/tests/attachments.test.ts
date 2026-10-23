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

const PDF = Buffer.from('%PDF-1.4\nTaskForge attachment test\n%%EOF\n');

const upload = (
    path: string,
    token: string,
    options: { content?: Buffer; filename?: string; contentType?: string } = {}
) => {
    const {
        content = PDF,
        filename = 'note.pdf',
        contentType = 'application/pdf',
    } = options;

    return api().post(path).set(auth(token)).attach('file', content, { filename, contentType });
};

const fileIds = (response: { body: { files: { _id: string }[] } }) =>
    response.body.files.map((file) => file._id);

describe('attachments', () => {
    it('round-trips a task attachment', async () => {
        const owner = await register('Owner');
        const project = await createProject(owner.token);
        const task = await createTask(owner.token, project._id);

        const uploaded = await upload(`/api/files/tasks/${task._id}`, owner.token);
        expect(uploaded.status).toBe(201);
        expect(uploaded.body.file.originalName).toBe('note.pdf');
        expect(uploaded.body.file.size).toBe(PDF.length);

        const fileId = uploaded.body.file._id;

        const listed = await api().get(`/api/files/tasks/${task._id}`).set(auth(owner.token));
        expect(listed.status).toBe(200);
        expect(fileIds(listed)).toContain(fileId);

        const downloaded = await api().get(`/api/files/${fileId}`).set(auth(owner.token));
        expect(downloaded.status).toBe(200);
        expect(downloaded.headers['content-type']).toContain('application/pdf');
        expect(downloaded.headers['content-disposition']).toContain('note.pdf');
        expect(Buffer.compare(downloaded.body as Buffer, PDF)).toBe(0);

        const taskAfter = await api().get(`/api/tasks/${task._id}`).set(auth(owner.token));
        expect(taskAfter.body.task.attachments.map(String)).toContain(fileId);

        await api().delete(`/api/files/${fileId}`).set(auth(owner.token)).expect(200);

        const afterDelete = await api().get(`/api/files/tasks/${task._id}`).set(auth(owner.token));
        expect(fileIds(afterDelete)).not.toContain(fileId);

        const taskCleared = await api().get(`/api/tasks/${task._id}`).set(auth(owner.token));
        expect(taskCleared.body.task.attachments.map(String)).not.toContain(fileId);
    });

    it('round-trips a project attachment separately from task attachments', async () => {
        const owner = await register('Owner');
        const project = await createProject(owner.token);
        const task = await createTask(owner.token, project._id);

        const uploaded = await upload(`/api/files/projects/${project._id}`, owner.token, {
            filename: 'spec.pdf',
        });
        expect(uploaded.status).toBe(201);
        const fileId = uploaded.body.file._id;

        const projectFiles = await api()
            .get(`/api/files/projects/${project._id}`)
            .set(auth(owner.token));
        expect(fileIds(projectFiles)).toContain(fileId);

        const taskFiles = await api().get(`/api/files/tasks/${task._id}`).set(auth(owner.token));
        expect(fileIds(taskFiles)).not.toContain(fileId);

        const downloaded = await api().get(`/api/files/${fileId}`).set(auth(owner.token));
        expect(downloaded.status).toBe(200);
        expect(downloaded.headers['content-disposition']).toContain('spec.pdf');

        await api().delete(`/api/files/${fileId}`).set(auth(owner.token)).expect(200);
    });

    it('refuses a non-member on upload, list and download', async () => {
        const owner = await register('Owner');
        const outsider = await register('Outsider');
        const project = await createProject(owner.token);
        const task = await createTask(owner.token, project._id);

        const uploaded = await upload(`/api/files/tasks/${task._id}`, owner.token);
        const fileId = uploaded.body.file._id;

        expect((await upload(`/api/files/tasks/${task._id}`, outsider.token)).status).toBe(403);
        expect(
            (await api().get(`/api/files/tasks/${task._id}`).set(auth(outsider.token))).status
        ).toBe(403);
        expect((await api().get(`/api/files/${fileId}`).set(auth(outsider.token))).status).toBe(
            403
        );
    });

    it('only lets the uploader or an admin delete a file', async () => {
        const owner = await register('Owner');
        const member = await register('Member');
        const adminAccount = await register('Admin');
        const adminToken = await promote(adminAccount.email);

        const project = await createProject(owner.token, [member.id]);
        const task = await createTask(owner.token, project._id);

        const first = await upload(`/api/files/tasks/${task._id}`, owner.token);
        const firstId = first.body.file._id;

        expect((await api().delete(`/api/files/${firstId}`).set(auth(member.token))).status).toBe(
            403
        );
        expect((await api().delete(`/api/files/${firstId}`).set(auth(owner.token))).status).toBe(
            200
        );

        const second = await upload(`/api/files/tasks/${task._id}`, owner.token);
        expect((await api().delete(`/api/files/${second.body.file._id}`).set(auth(adminToken))).status).toBe(
            200
        );
    });

    it('rejects an unsupported file type', async () => {
        const owner = await register('Owner');
        const project = await createProject(owner.token);
        const task = await createTask(owner.token, project._id);

        const response = await upload(`/api/files/tasks/${task._id}`, owner.token, {
            content: Buffer.from('MZ'),
            filename: 'malware.exe',
            contentType: 'application/x-msdownload',
        });

        expect(response.status).toBe(400);
        expect(response.body.message).toMatch(/Unsupported file type/i);
    });

    it('rejects a file larger than 10 MB', async () => {
        const owner = await register('Owner');
        const project = await createProject(owner.token);
        const task = await createTask(owner.token, project._id);

        const response = await upload(`/api/files/tasks/${task._id}`, owner.token, {
            content: Buffer.alloc(10 * 1024 * 1024 + 1, 0x61),
            filename: 'big.txt',
            contentType: 'text/plain',
        });

        expect(response.status).toBe(400);
        expect(response.body.message).toMatch(/too large/i);
    });

    it('requires a file on upload', async () => {
        const owner = await register('Owner');
        const project = await createProject(owner.token);
        const task = await createTask(owner.token, project._id);

        const response = await api().post(`/api/files/tasks/${task._id}`).set(auth(owner.token));

        expect(response.status).toBe(400);
        expect(response.body.message).toMatch(/file is required/i);
    });
});

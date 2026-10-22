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

describe('archive and restore', () => {
    it('archives a project for its owner, hides it and restores it', async () => {
        const owner = await register('Owner');
        const project = await createProject(owner.token);
        const url = `/api/projects/${project._id}`;

        expect((await api().put(`${url}/archive`).set(auth(owner.token))).status).toBe(200);

        expect((await api().get('/api/projects').set(auth(owner.token))).body.total).toBe(0);

        const archived = await api()
            .get('/api/projects?archived=archived')
            .set(auth(owner.token));
        expect(archived.body.total).toBe(1);
        expect(archived.body.projects[0].archived).toBe(true);

        expect((await api().put(`${url}/restore`).set(auth(owner.token))).status).toBe(200);
        expect((await api().get('/api/projects').set(auth(owner.token))).body.total).toBe(1);
    });

    it('rejects archiving by a plain member', async () => {
        const owner = await register('Owner');
        const member = await register('Member');
        const project = await createProject(owner.token, [member.id]);

        const response = await api()
            .put(`/api/projects/${project._id}/archive`)
            .set(auth(member.token));

        expect(response.status).toBe(403);
    });

    it('lets an admin archive a project they do not own', async () => {
        const owner = await register('Owner');
        const adminAccount = await register('Admin');
        const adminToken = await promote(adminAccount.email);
        const project = await createProject(owner.token);

        expect(
            (await api().put(`/api/projects/${project._id}/archive`).set(auth(adminToken))).status
        ).toBe(200);
    });

    it('hides the tasks of an archived project and brings them back on restore', async () => {
        const owner = await register('Owner');
        const project = await createProject(owner.token);
        const task = await createTask(owner.token, project._id, [owner.id]);

        expect((await api().get('/api/tasks').set(auth(owner.token))).body.total).toBe(1);
        expect((await api().get('/api/tasks/mine').set(auth(owner.token))).body.total).toBe(1);

        await api().put(`/api/projects/${project._id}/archive`).set(auth(owner.token)).expect(200);

        expect((await api().get('/api/tasks').set(auth(owner.token))).body.total).toBe(0);
        expect((await api().get('/api/tasks/mine').set(auth(owner.token))).body.total).toBe(0);

        await api().put(`/api/projects/${project._id}/restore`).set(auth(owner.token)).expect(200);
        expect((await api().get('/api/tasks').set(auth(owner.token))).body.total).toBe(1);

        const fetched = await api().get(`/api/tasks/${task._id}`).set(auth(owner.token));
        expect(fetched.body.task.archived).toBe(false);
    });

    it('archives a task for its creator only', async () => {
        const owner = await register('Owner');
        const member = await register('Member');
        const project = await createProject(owner.token, [member.id]);
        const task = await createTask(owner.token, project._id, [member.id]);

        expect(
            (await api().put(`/api/tasks/${task._id}/archive`).set(auth(member.token))).status
        ).toBe(403);

        expect((await api().put(`/api/tasks/${task._id}/archive`).set(auth(owner.token))).status).toBe(
            200
        );

        expect((await api().get('/api/tasks').set(auth(owner.token))).body.total).toBe(0);
        expect((await api().get('/api/tasks?archived=archived').set(auth(owner.token))).body.total).toBe(
            1
        );
    });

    it('returns active and archived records together for archived=all', async () => {
        const owner = await register('Owner');
        const first = await createProject(owner.token, [], 'First');
        await createProject(owner.token, [], 'Second');

        await api().put(`/api/projects/${first._id}/archive`).set(auth(owner.token)).expect(200);

        expect(
            (await api().get('/api/projects?archived=all').set(auth(owner.token))).body.total
        ).toBe(2);
        expect((await api().get('/api/projects').set(auth(owner.token))).body.total).toBe(1);
    });

    it('writes ARCHIVE and RESTORE audit entries', async () => {
        const account = await register('Admin');
        const token = await promote(account.email);
        const project = await createProject(token);

        await api().put(`/api/projects/${project._id}/archive`).set(auth(token)).expect(200);
        await api().put(`/api/projects/${project._id}/restore`).set(auth(token)).expect(200);

        const audit = await api().get('/api/audit?entity=Project').set(auth(token));
        const actions = audit.body.entries.map((entry: { action: string }) => entry.action);

        expect(actions.slice(0, 2)).toEqual(['RESTORE', 'ARCHIVE']);
    });

    it('no longer accepts archived on the user update', async () => {
        const account = await register('Admin');
        const token = await promote(account.email);
        const target = await register('Target');

        const response = await api()
            .put(`/api/users/${target.id}`)
            .set(auth(token))
            .send({ user: { archived: true } });

        expect(response.status).toBe(400);
    });
});

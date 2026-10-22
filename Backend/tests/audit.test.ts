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

async function adminWorld() {
    const account = await register('Admin');
    const token = await promote(account.email);
    return { account, token };
}

describe('audit log', () => {
    it('is admin-only', async () => {
        const { token } = await adminWorld();
        const regular = await register('Regular');

        expect((await api().get('/api/audit')).status).toBe(401);
        expect((await api().get('/api/audit').set(auth(regular.token))).status).toBe(403);
        expect((await api().get('/api/audit').set(auth(token))).status).toBe(200);
    });

    it('lists entries newest first with the populated actor', async () => {
        const { token } = await adminWorld();
        const project = await createProject(token);

        await createTask(token, project._id);

        const response = await api().get('/api/audit').set(auth(token));

        expect(response.body.total).toBe(2);
        expect(response.body.entries[0]).toMatchObject({ action: 'CREATE', entity: 'Task' });
        expect(response.body.entries[1]).toMatchObject({ action: 'CREATE', entity: 'Project' });
        expect(response.body.entries[0].userId.name).toBe('Admin');
    });

    it('filters by entity and action', async () => {
        const { token } = await adminWorld();
        const project = await createProject(token);
        const task = await createTask(token, project._id);
        await api().delete(`/api/tasks/${task._id}`).set(auth(token)).expect(200);

        const tasks = await api().get('/api/audit?entity=Task').set(auth(token));
        expect(tasks.body.entries).toHaveLength(2);
        expect(tasks.body.entries.every((entry: { entity: string }) => entry.entity === 'Task')).toBe(
            true
        );

        const deletes = await api().get('/api/audit?action=DELETE').set(auth(token));
        expect(deletes.body.entries).toHaveLength(1);
        expect(deletes.body.entries[0]).toMatchObject({ action: 'DELETE', entity: 'Task' });
    });

    it('stores only the changed fields on an update', async () => {
        const { token } = await adminWorld();
        const project = await createProject(token);
        const task = await createTask(token, project._id);

        await api()
            .put(`/api/tasks/${task._id}`)
            .set(auth(token))
            .send({ task: { title: 'Renamed' } })
            .expect(200);

        const response = await api().get('/api/audit?entity=Task&action=UPDATE').set(auth(token));
        const entry = response.body.entries[0];

        expect(entry.oldData.title).toBe('Test Task');
        expect(entry.newData.title).toBe('Renamed');
        expect(Object.keys(entry.oldData)).not.toContain('description');
    });

    it('never stores the password', async () => {
        const { token } = await adminWorld();
        const target = await register('Target');

        await api()
            .put(`/api/users/${target.id}`)
            .set(auth(token))
            .send({ user: { roles: ['DEV'] } })
            .expect(200);

        const response = await api().get('/api/audit?entity=User&action=UPDATE').set(auth(token));
        const entry = response.body.entries[0];

        expect(entry.newData).toEqual({ roles: ['DEV'] });
        expect(JSON.stringify(entry)).not.toContain('password');
    });

    it('snapshots the record when it is deleted', async () => {
        const { token } = await adminWorld();
        const project = await createProject(token);
        const task = await createTask(token, project._id);

        await api().delete(`/api/tasks/${task._id}`).set(auth(token)).expect(200);

        const response = await api().get('/api/audit?action=DELETE').set(auth(token));

        expect(response.body.entries[0].oldData.title).toBe('Test Task');
    });

    it('paginates without losing the total', async () => {
        const { token } = await adminWorld();
        const project = await createProject(token);
        await createTask(token, project._id);

        const response = await api().get('/api/audit?limit=1').set(auth(token));

        expect(response.body.entries).toHaveLength(1);
        expect(response.body.total).toBe(2);
    });
});

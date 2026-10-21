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

async function world() {
    const adminAccount = await register('Admin');
    const adminToken = await promote(adminAccount.email);

    const owner = await register('Owner');
    const member = await register('Member');
    const outsider = await register('Outsider');

    const project = await createProject(owner.token, [member.id]);
    const task = await createTask(owner.token, project._id, [member.id]);

    return { adminToken, owner, member, outsider, project, task };
}

describe('task permissions', () => {
    it('lets a project member create a task and links it to the project', async () => {
        const { owner, member, project } = await world();

        const response = await api()
            .post('/api/tasks')
            .set(auth(member.token))
            .send({ task: { projectId: project._id, title: 'Member task' } });

        expect(response.status).toBe(201);

        const updated = await api().get(`/api/projects/${project._id}`).set(auth(owner.token));
        expect(updated.body.project.tasks.map(String)).toContain(response.body.task._id);
    });

    it('rejects a task created by a non-member', async () => {
        const { outsider, project } = await world();

        const response = await api()
            .post('/api/tasks')
            .set(auth(outsider.token))
            .send({ task: { projectId: project._id, title: 'Outsider task' } });

        expect(response.status).toBe(403);
    });

    it('hides a task from non-members and shows it to members', async () => {
        const { member, outsider, task } = await world();

        expect((await api().get(`/api/tasks/${task._id}`).set(auth(outsider.token))).status).toBe(
            403
        );
        expect((await api().get(`/api/tasks/${task._id}`).set(auth(member.token))).status).toBe(
            200
        );
    });

    it('only lets the creator update the task', async () => {
        const { owner, member, task } = await world();

        const forbidden = await api()
            .put(`/api/tasks/${task._id}`)
            .set(auth(member.token))
            .send({ task: { title: 'Hijacked' } });
        expect(forbidden.status).toBe(403);

        const allowed = await api()
            .put(`/api/tasks/${task._id}`)
            .set(auth(owner.token))
            .send({ task: { title: 'Renamed' } });
        expect(allowed.status).toBe(200);
        expect(allowed.body.task.title).toBe('Renamed');
    });

    it('lets an admin update any task', async () => {
        const { adminToken, task } = await world();

        const response = await api()
            .put(`/api/tasks/${task._id}`)
            .set(auth(adminToken))
            .send({ task: { status: 'COM' } });

        expect(response.status).toBe(200);
        expect(response.body.task.status).toBe('COM');
    });

    it('only lets the creator or an admin delete the task', async () => {
        const { owner, member, project, task } = await world();

        expect((await api().delete(`/api/tasks/${task._id}`).set(auth(member.token))).status).toBe(
            403
        );

        expect((await api().delete(`/api/tasks/${task._id}`).set(auth(owner.token))).status).toBe(
            200
        );

        const updated = await api().get(`/api/projects/${project._id}`).set(auth(owner.token));
        expect(updated.body.project.tasks.map(String)).not.toContain(task._id);
    });
});

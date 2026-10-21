import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
    api,
    auth,
    clearDb,
    connectDb,
    createProject,
    disconnectDb,
    promote,
    register,
} from './helpers.ts';

beforeAll(connectDb);
beforeEach(clearDb);
afterAll(disconnectDb);

const createWorkflow = (token: string, workflow: Record<string, unknown>) =>
    api().post('/api/workflows').set(auth(token)).send({ workflow });

describe('workflows', () => {
    it('creates a workflow owned by the actor and derives progress from linked projects', async () => {
        const owner = await register('Owner');
        const first = await createProject(owner.token, [], 'First', { progress: 20 });
        const second = await createProject(owner.token, [], 'Second', { progress: 60 });

        const response = await createWorkflow(owner.token, {
            name: 'Delivery',
            project: [first._id, second._id],
        });

        expect(response.status).toBe(201);
        expect(response.body.workflow.owner).toBe(owner.id);

        const fetched = await api()
            .get(`/api/workflows/${response.body.workflow._id}`)
            .set(auth(owner.token));

        expect(fetched.body.workflow.progress).toBe(40);
        expect(fetched.body.workflow.project).toHaveLength(2);
    });

    it('shows a workflow to its members but not to outsiders', async () => {
        const owner = await register('Owner');
        const member = await register('Member');
        const outsider = await register('Outsider');

        const created = await createWorkflow(owner.token, {
            name: 'Shared',
            members: [member.id],
        });
        const id = created.body.workflow._id;

        expect((await api().get(`/api/workflows/${id}`).set(auth(member.token))).status).toBe(200);
        expect((await api().get(`/api/workflows/${id}`).set(auth(outsider.token))).status).toBe(
            403
        );
        expect((await api().get('/api/workflows').set(auth(member.token))).body.total).toBe(1);
        expect((await api().get('/api/workflows').set(auth(outsider.token))).body.total).toBe(0);
    });

    it('nests children and maintains both sides of the tree', async () => {
        const owner = await register('Owner');
        const parent = await createWorkflow(owner.token, { name: 'Parent' });
        const child = await createWorkflow(owner.token, {
            name: 'Child',
            parentId: parent.body.workflow._id,
        });

        expect(child.status).toBe(201);

        const fetched = await api()
            .get(`/api/workflows/${parent.body.workflow._id}`)
            .set(auth(owner.token));

        expect(fetched.body.workflow.children.map((node: { _id: string }) => node._id)).toContain(
            child.body.workflow._id
        );
    });

    it('rejects a move that would create a cycle', async () => {
        const owner = await register('Owner');
        const parent = await createWorkflow(owner.token, { name: 'Parent' });
        const child = await createWorkflow(owner.token, {
            name: 'Child',
            parentId: parent.body.workflow._id,
        });

        const response = await api()
            .put(`/api/workflows/${parent.body.workflow._id}`)
            .set(auth(owner.token))
            .send({ workflow: { parentId: child.body.workflow._id } });

        expect(response.status).toBe(400);
    });

    it('blocks deleting a workflow that still has children', async () => {
        const owner = await register('Owner');
        const parent = await createWorkflow(owner.token, { name: 'Parent' });
        const child = await createWorkflow(owner.token, {
            name: 'Child',
            parentId: parent.body.workflow._id,
        });

        const blocked = await api()
            .delete(`/api/workflows/${parent.body.workflow._id}`)
            .set(auth(owner.token));
        expect(blocked.status).toBe(400);

        expect(
            (await api().delete(`/api/workflows/${child.body.workflow._id}`).set(auth(owner.token)))
                .status
        ).toBe(200);
        expect(
            (await api().delete(`/api/workflows/${parent.body.workflow._id}`).set(auth(owner.token)))
                .status
        ).toBe(200);
    });

    it('only lets the owner or an admin delete, and only an admin changes the owner', async () => {
        const owner = await register('Owner');
        const member = await register('Member');
        const adminAccount = await register('Admin');
        const adminToken = await promote(adminAccount.email);

        const created = await createWorkflow(owner.token, {
            name: 'Team workflow',
            members: [member.id],
        });
        const id = created.body.workflow._id;

        expect((await api().delete(`/api/workflows/${id}`).set(auth(member.token))).status).toBe(
            403
        );

        const memberPatch = await api()
            .put(`/api/workflows/${id}`)
            .set(auth(member.token))
            .send({ workflow: { owner: member.id } });
        expect(memberPatch.status).toBe(200);
        expect(memberPatch.body.workflow.owner).toBe(owner.id);

        const adminPatch = await api()
            .put(`/api/workflows/${id}`)
            .set(auth(adminToken))
            .send({ workflow: { owner: member.id } });
        expect(adminPatch.status).toBe(200);
        expect(adminPatch.body.workflow.owner).toBe(member.id);
    });

    it('rejects linking a project the actor cannot see', async () => {
        const owner = await register('Owner');
        const member = await register('Member');
        const hidden = await createProject(owner.token, [], 'Private');

        const response = await createWorkflow(member.token, {
            name: 'Nope',
            project: [hidden._id],
        });

        expect(response.status).toBe(400);
    });

    it('unlinks projects without deleting them', async () => {
        const owner = await register('Owner');
        const project = await createProject(owner.token);
        const created = await createWorkflow(owner.token, {
            name: 'With project',
            project: [project._id],
        });

        await api()
            .delete(`/api/workflows/${created.body.workflow._id}`)
            .set(auth(owner.token))
            .expect(200);

        expect((await api().get(`/api/projects/${project._id}`).set(auth(owner.token))).status).toBe(
            200
        );
    });

    it('writes audit entries for workflow changes', async () => {
        const account = await register('Admin');
        const token = await promote(account.email);

        const created = await createWorkflow(token, { name: 'Audited' });
        const id = created.body.workflow._id;

        await api()
            .put(`/api/workflows/${id}`)
            .set(auth(token))
            .send({ workflow: { status: 'IP' } })
            .expect(200);
        await api().delete(`/api/workflows/${id}`).set(auth(token)).expect(200);

        const audit = await api().get('/api/audit?entity=Workflow').set(auth(token));

        expect(audit.body.total).toBe(3);
        expect(
            audit.body.entries.map((entry: { action: string }) => entry.action)
        ).toEqual(['DELETE', 'UPDATE', 'CREATE']);
    });
});

import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import app from '../src/app.ts';
import {
    api,
    auth,
    clearDb,
    connectDb,
    createProject,
    disconnectDb,
    PASSWORD,
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

const archiveUrl = (id: string) => `/api/users/${id}/archive`;
const restoreUrl = (id: string) => `/api/users/${id}/restore`;

describe('user deactivation', () => {
    it('blocks login, refresh and an already-issued access token', async () => {
        const { token } = await adminWorld();
        const agent = request.agent(app);
        const email = 'archived-target@example.com';

        const registered = await agent
            .post('/api/auth/register')
            .send({ user: { name: 'Target', email, password: PASSWORD } })
            .expect(201);
        const targetId = registered.body.user._id;
        const targetToken = registered.body.accessToken;

        expect((await api().get('/api/auth/profile').set(auth(targetToken))).status).toBe(200);

        await api().put(archiveUrl(targetId)).set(auth(token)).expect(200);

        expect((await api().get('/api/auth/profile').set(auth(targetToken))).status).toBe(401);

        const login = await api().post('/api/auth/login').send({ email, password: PASSWORD });
        expect(login.status).toBe(401);
        expect(login.body.message).toMatch(/archived/i);

        expect((await agent.post('/api/auth/refresh')).status).toBe(401);
    });

    it('hides archived users from pickers and the default list', async () => {
        const { token } = await adminWorld();
        const target = await register('Target');

        await api().put(archiveUrl(target.id)).set(auth(token)).expect(200);

        const options = await api().get('/api/users/options').set(auth(token));
        expect(options.body.users.map((user: { email: string }) => user.email)).not.toContain(
            target.email
        );

        const active = await api().get('/api/users').set(auth(token));
        expect(active.body.users.map((user: { email: string }) => user.email)).not.toContain(
            target.email
        );

        const archived = await api().get('/api/users?archived=archived').set(auth(token));
        expect(archived.body.users.map((user: { email: string }) => user.email)).toContain(
            target.email
        );

        const all = await api().get('/api/users?archived=all').set(auth(token));
        expect(all.body.users.map((user: { email: string }) => user.email)).toContain(target.email);
    });

    it('restores the account', async () => {
        const { token } = await adminWorld();
        const target = await register('Target');

        await api().put(archiveUrl(target.id)).set(auth(token)).expect(200);
        await api().put(restoreUrl(target.id)).set(auth(token)).expect(200);

        const login = await api()
            .post('/api/auth/login')
            .send({ email: target.email, password: PASSWORD });

        expect(login.status).toBe(200);
        expect(login.body.accessToken).toBeTypeOf('string');
    });

    it('refuses to archive the acting admin', async () => {
        const { account, token } = await adminWorld();

        const response = await api().put(archiveUrl(account.id)).set(auth(token));

        expect(response.status).toBe(400);
        expect(response.body.message).toMatch(/your own account/i);
    });

    it('is admin-only', async () => {
        const { token } = await adminWorld();
        const regular = await register('Regular');

        expect((await api().put(archiveUrl(regular.id)).set(auth(regular.token))).status).toBe(403);
        expect((await api().put(archiveUrl(regular.id)).set(auth(token))).status).toBe(200);
    });

    it('keeps the user data and its references intact', async () => {
        const { token } = await adminWorld();
        const owner = await register('Owner');
        const project = await createProject(owner.token, [], 'Owned project');

        await api().put(archiveUrl(owner.id)).set(auth(token)).expect(200);

        const fetched = await api().get(`/api/projects/${project._id}`).set(auth(token));
        expect(fetched.body.project.owner.name).toBe('Owner');
    });

    it('is idempotent and records one audit entry per transition', async () => {
        const { token } = await adminWorld();
        const target = await register('Target');

        await api().put(archiveUrl(target.id)).set(auth(token)).expect(200);
        await api().put(archiveUrl(target.id)).set(auth(token)).expect(200);
        await api().put(restoreUrl(target.id)).set(auth(token)).expect(200);

        const archived = await api()
            .get('/api/audit?entity=User&action=ARCHIVE')
            .set(auth(token));
        const restored = await api()
            .get('/api/audit?entity=User&action=RESTORE')
            .set(auth(token));

        expect(archived.body.total).toBe(1);
        expect(restored.body.total).toBe(1);
    });
});

import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import app from '../src/app.ts';
import {
    api,
    auth,
    clearDb,
    connectDb,
    disconnectDb,
    PASSWORD,
    promote,
    register,
} from './helpers.ts';

beforeAll(connectDb);
beforeEach(clearDb);
afterAll(disconnectDb);

const profileWith = (token: string) =>
    api().get('/api/auth/profile').set(auth(token));

describe('session invalidation', () => {
    it('kills the old access token and refresh cookie on a password change', async () => {
        const agent = request.agent(app);
        const email = 'password-change@example.com';

        const registered = await agent
            .post('/api/auth/register')
            .send({ user: { name: 'Session', email, password: PASSWORD } })
            .expect(201);
        const oldToken = registered.body.accessToken;

        expect((await profileWith(oldToken)).status).toBe(200);

        await api()
            .put('/api/auth/profile')
            .set(auth(oldToken))
            .send({ user: { password: 'NewPassw0rd1' } })
            .expect(200);

        expect((await profileWith(oldToken)).status).toBe(401);
        expect((await agent.post('/api/auth/refresh')).status).toBe(401);
        expect((await api().post('/api/auth/login').send({ email, password: PASSWORD })).status).toBe(
            401
        );

        const relogin = await api()
            .post('/api/auth/login')
            .send({ email, password: 'NewPassw0rd1' });

        expect(relogin.status).toBe(200);
        expect((await profileWith(relogin.body.accessToken)).status).toBe(200);
    });

    it('kills the target sessions when an admin resets a password', async () => {
        const adminAccount = await register('Admin');
        const adminToken = await promote(adminAccount.email);
        const target = await register('Target');

        await api()
            .put(`/api/users/${target.id}`)
            .set(auth(adminToken))
            .send({ user: { password: 'ResetPassw0rd1' } })
            .expect(200);

        expect((await profileWith(target.token)).status).toBe(401);

        const relogin = await api()
            .post('/api/auth/login')
            .send({ email: target.email, password: 'ResetPassw0rd1' });

        expect(relogin.status).toBe(200);
        expect((await profileWith(relogin.body.accessToken)).status).toBe(200);
    });

    it('revokes every session of one user without touching another', async () => {
        const first = await register('First');
        const other = await register('Other');

        await api().post('/api/auth/logout-all').set(auth(first.token)).expect(200);

        expect((await profileWith(first.token)).status).toBe(401);
        expect((await profileWith(other.token)).status).toBe(200);

        const relogin = await api()
            .post('/api/auth/login')
            .send({ email: first.email, password: PASSWORD });

        expect(relogin.status).toBe(200);
        expect((await profileWith(relogin.body.accessToken)).status).toBe(200);
    });

    it('accepts a legacy token without a version while the user is at version zero', async () => {
        const account = await register('Legacy');
        const legacy = jwt.sign({ id: account.id }, String(process.env.JWT_SECRET), {
            expiresIn: '15m',
        });

        expect((await profileWith(legacy)).status).toBe(200);

        await api().post('/api/auth/logout-all').set(auth(legacy)).expect(200);

        expect((await profileWith(legacy)).status).toBe(401);
    });

    it('requires authentication for sign out everywhere', async () => {
        expect((await api().post('/api/auth/logout-all')).status).toBe(401);
    });
});

import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import app from '../src/app.ts';
import { api, clearDb, connectDb, disconnectDb, PASSWORD, register } from './helpers.ts';

beforeAll(connectDb);
beforeEach(clearDb);
afterAll(disconnectDb);

const payload = (email: string) => ({
    user: { name: 'Auth User', email, password: PASSWORD },
});

describe('auth', () => {
    it('registers a user and returns a token without the password', async () => {
        const response = await api().post('/api/auth/register').send(payload('ann@example.com'));

        expect(response.status).toBe(201);
        expect(response.body.accessToken).toBeTypeOf('string');
        expect(response.body.user).toMatchObject({ email: 'ann@example.com', memberType: 'USER' });
        expect(response.body.user.password).toBeUndefined();
        expect(String(response.headers['set-cookie'])).toContain('refreshToken=');
    });

    it('rejects a duplicate email', async () => {
        await api().post('/api/auth/register').send(payload('dup@example.com')).expect(201);

        const response = await api().post('/api/auth/register').send(payload('dup@example.com'));

        expect(response.status).toBe(400);
    });

    it('rejects a wrong password', async () => {
        const account = await register('Auth User');

        const response = await api()
            .post('/api/auth/login')
            .send({ email: account.email, password: 'NotThePassword1' });

        expect(response.status).toBe(401);
    });

    it('requires a token for the profile', async () => {
        const account = await register('Auth User');

        expect((await api().get('/api/auth/profile')).status).toBe(401);

        const response = await api()
            .get('/api/auth/profile')
            .set('Authorization', `Bearer ${account.token}`);

        expect(response.status).toBe(200);
        expect(response.body.user.email).toBe(account.email);
    });

    it('refreshes with the cookie and rejects a request without one', async () => {
        const agent = request.agent(app);
        await agent.post('/api/auth/register').send(payload('refresh@example.com')).expect(201);

        const refreshed = await agent.post('/api/auth/refresh');

        expect(refreshed.status).toBe(200);
        expect(refreshed.body.accessToken).toBeTypeOf('string');
        expect((await api().post('/api/auth/refresh')).status).toBe(401);
    });

    it('clears the refresh cookie on logout', async () => {
        const agent = request.agent(app);
        await agent.post('/api/auth/register').send(payload('logout@example.com')).expect(201);

        const response = await agent.post('/api/auth/logout');

        expect(response.status).toBe(200);
        expect(String(response.headers['set-cookie'])).toMatch(/refreshToken=;/);
    });
});

import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app.ts';
import userModel from '../src/models/User.ts';

export const PASSWORD = 'Passw0rd1';

let sequence = 0;

export interface Account {
    id: string;
    email: string;
    password: string;
    token: string;
}

export const api = () => request(app);

export async function connectDb() {
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGO_URI as string);
    }
}

export async function disconnectDb() {
    await mongoose.disconnect();
}

export async function clearDb() {
    const { db } = mongoose.connection;
    if (!db) throw new Error('Not connected to MongoDB');

    if (!db.databaseName.endsWith('_test')) {
        throw new Error(`Refusing to clear a non-test database: ${db.databaseName}`);
    }

    const collections = await db.collections();
    await Promise.all(collections.map((collection) => collection.deleteMany({})));
}

export async function register(name = 'Test User'): Promise<Account> {
    const email = `user${++sequence}.${Date.now()}@example.com`;
    const response = await api()
        .post('/api/auth/register')
        .send({ user: { name, email, password: PASSWORD } });

    if (response.status !== 201) {
        throw new Error(`register failed (${response.status}): ${JSON.stringify(response.body)}`);
    }

    return {
        id: response.body.user._id,
        email,
        password: PASSWORD,
        token: response.body.accessToken,
    };
}

export async function login(email: string, password = PASSWORD) {
    const response = await api().post('/api/auth/login').send({ email, password });
    if (response.status !== 200) {
        throw new Error(`login failed (${response.status}): ${JSON.stringify(response.body)}`);
    }
    return response.body.accessToken as string;
}

export async function promote(email: string) {
    await userModel.updateOne({ email }, { memberType: 'ADMIN' });
    return login(email);
}

export const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

export async function createProject(token: string, members: string[] = [], name = 'Test Project') {
    const response = await api()
        .post('/api/projects')
        .set(auth(token))
        .send({ project: { name, members } });

    if (response.status !== 201) {
        throw new Error(`project create failed (${response.status}): ${JSON.stringify(response.body)}`);
    }
    return response.body.project;
}

export async function createTask(
    token: string,
    projectId: string,
    assignedTo: string[] = [],
    title = 'Test Task'
) {
    const response = await api()
        .post('/api/tasks')
        .set(auth(token))
        .send({ task: { projectId, title, assignedTo } });

    if (response.status !== 201) {
        throw new Error(`task create failed (${response.status}): ${JSON.stringify(response.body)}`);
    }
    return response.body.task;
}

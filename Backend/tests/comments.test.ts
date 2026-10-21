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
    const owner = await register('Owner');
    const member = await register('Member');
    const other = await register('Other');
    const outsider = await register('Outsider');

    const project = await createProject(owner.token, [member.id, other.id]);
    const task = await createTask(owner.token, project._id);

    const comment = (token: string, text: string, parentId?: string) =>
        api()
            .post(`/api/comments/tasks/${task._id}`)
            .set(auth(token))
            .send({ comment: { text, parentId } });

    return { owner, member, other, outsider, project, task, comment };
}

describe('task comments', () => {
    it('lets a member comment and links the comment to the task', async () => {
        const { owner, member, task, comment } = await world();

        const response = await comment(member.token, 'Hello');

        expect(response.status).toBe(201);

        const taskAfter = await api().get(`/api/tasks/${task._id}`).set(auth(owner.token));
        expect(taskAfter.body.task.comments.map(String)).toContain(response.body.comment._id);
    });

    it('rejects a comment from a non-member', async () => {
        const { outsider, comment } = await world();

        expect((await comment(outsider.token, 'Hello')).status).toBe(403);
    });

    it('allows one level of replies only', async () => {
        const { member, comment } = await world();

        const root = await comment(member.token, 'Root');
        const reply = await comment(member.token, 'Reply', root.body.comment._id);
        const nested = await comment(member.token, 'Nested', reply.body.comment._id);

        expect(root.status).toBe(201);
        expect(reply.status).toBe(201);
        expect(nested.status).toBe(400);
    });

    it('only lets the author or an admin edit a comment', async () => {
        const { owner, member, other, comment } = await world();
        const created = await comment(member.token, 'Original');
        const id = created.body.comment._id;

        const foreign = await api()
            .put(`/api/comments/${id}`)
            .set(auth(other.token))
            .send({ comment: { text: 'Hijacked' } });
        expect(foreign.status).toBe(403);

        const own = await api()
            .put(`/api/comments/${id}`)
            .set(auth(member.token))
            .send({ comment: { text: 'Edited' } });
        expect(own.status).toBe(200);
        expect(own.body.comment.text).toBe('Edited');

        const adminToken = await promote(owner.email);
        const byAdmin = await api()
            .put(`/api/comments/${id}`)
            .set(auth(adminToken))
            .send({ comment: { text: 'Admin edit' } });
        expect(byAdmin.status).toBe(200);
    });

    it('deletes a comment with its replies', async () => {
        const { owner, member, task, comment } = await world();

        const root = await comment(member.token, 'Root');
        await comment(member.token, 'Reply', root.body.comment._id);

        const deleted = await api()
            .delete(`/api/comments/${root.body.comment._id}`)
            .set(auth(member.token));
        expect(deleted.status).toBe(200);

        const listed = await api()
            .get(`/api/comments/tasks/${task._id}`)
            .set(auth(owner.token));
        expect(listed.body.comments).toHaveLength(0);
    });
});

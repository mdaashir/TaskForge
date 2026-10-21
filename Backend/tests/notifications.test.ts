import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
    api,
    auth,
    clearDb,
    connectDb,
    createProject,
    createTask,
    disconnectDb,
    register,
} from './helpers.ts';

beforeAll(connectDb);
beforeEach(clearDb);
afterAll(disconnectDb);

async function world() {
    const owner = await register('Owner');
    const member = await register('Member');
    const project = await createProject(owner.token, [member.id]);

    return { owner, member, project };
}

describe('notifications', () => {
    it('notifies the assignee but not the actor', async () => {
        const { owner, member, project } = await world();

        await createTask(owner.token, project._id, [member.id]);

        const forMember = await api().get('/api/notifications').set(auth(member.token));
        expect(forMember.status).toBe(200);
        expect(forMember.body.notifications).toHaveLength(1);
        expect(forMember.body.notifications[0].message).toContain('assigned you');

        const forOwner = await api().get('/api/notifications').set(auth(owner.token));
        expect(forOwner.body.notifications).toHaveLength(0);
    });

    it('counts unread notifications and marks one as seen', async () => {
        const { owner, member, project } = await world();
        await createTask(owner.token, project._id, [member.id]);

        const list = await api().get('/api/notifications').set(auth(member.token));
        const id = list.body.notifications[0]._id;

        expect((await api().get('/api/notifications/unread-count').set(auth(member.token))).body)
            .toEqual({ count: 1 });

        const seen = await api()
            .put(`/api/notifications/${id}/seen`)
            .set(auth(member.token));
        expect(seen.status).toBe(200);

        expect((await api().get('/api/notifications/unread-count').set(auth(member.token))).body)
            .toEqual({ count: 0 });
    });

    it('does not let someone mark another user notification as seen', async () => {
        const { owner, member, project } = await world();
        await createTask(owner.token, project._id, [member.id]);

        const list = await api().get('/api/notifications').set(auth(member.token));
        const id = list.body.notifications[0]._id;

        const response = await api()
            .put(`/api/notifications/${id}/seen`)
            .set(auth(owner.token));

        expect(response.status).toBe(404);
    });

    it('marks all notifications as seen', async () => {
        const { owner, member, project } = await world();
        await createTask(owner.token, project._id, [member.id], 'First');
        await createTask(owner.token, project._id, [member.id], 'Second');

        const response = await api()
            .put('/api/notifications/seen-all')
            .set(auth(member.token));

        expect(response.status).toBe(200);
        expect(response.body.marked).toBe(2);
        expect((await api().get('/api/notifications/unread-count').set(auth(member.token))).body)
            .toEqual({ count: 0 });
    });
});

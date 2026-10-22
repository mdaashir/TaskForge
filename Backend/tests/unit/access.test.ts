import { describe, expect, it } from 'vitest';
import type { IProject, IUser } from '../../src/types.ts';
import { canDeleteProject, canViewProject, idOf, isAdmin } from '../../src/utils/access.ts';

const user = (id: string, memberType: IUser['memberType']) =>
    ({ _id: id, memberType }) as unknown as IUser;
const project = (owner: string, members: string[]) =>
    ({ _id: 'p1', owner, members }) as unknown as IProject;

const admin = user('admin', 'ADMIN');
const owner = user('owner', 'USER');
const member = user('member', 'USER');
const stranger = user('stranger', 'USER');

describe('idOf', () => {
    it('reads _id from a populated reference', () => {
        expect(idOf({ _id: 'ref' })).toBe('ref');
    });

    it('passes strings through', () => {
        expect(idOf('plain')).toBe('plain');
    });
});

describe('isAdmin', () => {
    it('is true only for the admin member type', () => {
        expect(isAdmin(admin)).toBe(true);
        expect(isAdmin(owner)).toBe(false);
    });
});

describe('canViewProject', () => {
    const subject = project('owner', ['member']);

    it('allows the owner, a member and an admin', () => {
        expect(canViewProject(subject, owner)).toBe(true);
        expect(canViewProject(subject, member)).toBe(true);
        expect(canViewProject(subject, admin)).toBe(true);
    });

    it('denies everyone else', () => {
        expect(canViewProject(subject, stranger)).toBe(false);
    });
});

describe('canDeleteProject', () => {
    const subject = project('owner', ['member']);

    it('allows the owner and an admin', () => {
        expect(canDeleteProject(subject, owner)).toBe(true);
        expect(canDeleteProject(subject, admin)).toBe(true);
    });

    it('denies a plain member', () => {
        expect(canDeleteProject(subject, member)).toBe(false);
    });
});

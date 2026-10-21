import { describe, expect, it } from 'vitest';
import type { Workflow } from '../types.ts';
import { parentIdOf, unavailableParentIds } from './workflows.ts';

const node = (id: string, parentId: string | null = null): Workflow => ({
    _id: id,
    name: id,
    progress: 0,
    status: 'PE',
    owner: 'u1',
    parentId,
});

describe('parentIdOf', () => {
    it('reads the id from a populated parent or a plain id', () => {
        expect(parentIdOf(node('a'))).toBeNull();
        expect(parentIdOf({ ...node('a'), parentId: 'p1' })).toBe('p1');
        expect(parentIdOf({ ...node('a'), parentId: { _id: 'p2', name: 'Parent' } })).toBe('p2');
    });
});

describe('unavailableParentIds', () => {
    const workflows = [
        node('root'),
        node('child', 'root'),
        node('grandchild', 'child'),
        node('sibling', 'root'),
        node('other'),
    ];

    it('blocks the workflow itself and all of its descendants', () => {
        expect([...unavailableParentIds(workflows, 'root')].sort()).toEqual(
            ['child', 'grandchild', 'root', 'sibling'].sort()
        );
        expect([...unavailableParentIds(workflows, 'child')].sort()).toEqual(
            ['child', 'grandchild'].sort()
        );
    });

    it('does not block unrelated branches', () => {
        const blocked = unavailableParentIds(workflows, 'child');

        expect(blocked.has('sibling')).toBe(false);
        expect(blocked.has('other')).toBe(false);
    });
});

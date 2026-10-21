import { describe, expect, it } from 'vitest';
import auditService from '../../src/services/auditService.ts';

describe('auditService.snapshot', () => {
    it('drops sensitive and internal fields', () => {
        const snapshot = auditService.snapshot({
            _id: 'abc',
            name: 'Ann',
            password: 'secret',
            __v: 0,
            createdAt: 'a',
            updatedAt: 'b',
            title: 'Task',
        });

        expect(snapshot).toEqual({ name: 'Ann', title: 'Task' });
    });

    it('returns null for non-objects', () => {
        expect(auditService.snapshot(null)).toBeNull();
        expect(auditService.snapshot('text')).toBeNull();
    });
});

describe('auditService.diff', () => {
    it('keeps only the fields that changed', () => {
        const { oldData, newData } = auditService.diff(
            { title: 'Old', status: 'PE' },
            { title: 'New', status: 'PE' }
        );

        expect(oldData).toEqual({ title: 'Old' });
        expect(newData).toEqual({ title: 'New' });
    });

    it('reports null when nothing changed', () => {
        const { oldData, newData } = auditService.diff({ title: 'Same' }, { title: 'Same' });

        expect(oldData).toBeNull();
        expect(newData).toBeNull();
    });
});

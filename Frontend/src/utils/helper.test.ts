import { afterEach, describe, expect, it, vi } from 'vitest';
import { homeForRole, refId, refName, relativeTime } from './helper.ts';

afterEach(() => {
    vi.useRealTimers();
});

describe('relativeTime', () => {
    it('returns a dash for missing or invalid input', () => {
        expect(relativeTime()).toBe('—');
        expect(relativeTime('not-a-date')).toBe('—');
    });

    it('formats recent times', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));

        expect(relativeTime('2026-01-01T11:59:30Z')).toBe('just now');
    });

    it('moves up through minutes, hours, days, months and years', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));

        expect(relativeTime('2026-01-01T11:59:00Z')).toBe('1 minute ago');
        expect(relativeTime('2026-01-01T11:00:00Z')).toBe('1 hour ago');
        expect(relativeTime('2026-01-01T10:00:00Z')).toBe('2 hours ago');
        expect(relativeTime('2025-12-30T12:00:00Z')).toBe('2 days ago');
        expect(relativeTime('2025-10-03T12:00:00Z')).toBe('3 months ago');
        expect(relativeTime('2024-11-27T12:00:00Z')).toBe('1 year ago');
    });
});

describe('homeForRole', () => {
    it('routes each member type home', () => {
        expect(homeForRole('ADMIN')).toBe('/admin/dashboard');
        expect(homeForRole('USER')).toBe('/user/dashboard');
        expect(homeForRole('VIEWER')).toBe('/projects');
        expect(homeForRole()).toBe('/projects');
    });
});

describe('reference helpers', () => {
    it('reads ids and names from populated references', () => {
        expect(refId({ _id: 'id-1' })).toBe('id-1');
        expect(refId('id-2')).toBe('id-2');
        expect(refId()).toBe('');

        expect(refName({ name: 'Ann' })).toBe('Ann');
        expect(refName('Bob')).toBe('Bob');
        expect(refName()).toBe('—');
    });
});

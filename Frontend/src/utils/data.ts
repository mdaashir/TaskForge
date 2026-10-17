import type { MemberType } from '../types.ts';

export const MEMBER_TYPE_OPTIONS: { value: MemberType; label: string }[] = [
    { value: 'ADMIN', label: 'Admin' },
    { value: 'VIEWER', label: 'Viewer' },
    { value: 'USER', label: 'User' },
];

export const STATE_OPTIONS: { value: string; label: string }[] = [
    { value: 'A', label: 'Active' },
    { value: 'I', label: 'InActive' },
];

export const ROLE_OPTIONS: { value: string; label: string }[] = [
    { value: 'HR', label: 'Human Resources' },
    { value: 'PM', label: 'Project Manager' },
    { value: 'TL', label: 'Team Leader' },
    { value: 'DEV', label: 'Developer' },
    { value: 'QA', label: 'Quality Assurance' },
    { value: 'BA', label: 'Business Analyst' },
    { value: 'TEST', label: 'Tester' },
    { value: 'OPS', label: 'DevOps' },
];

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

export const STATUS_OPTIONS: { value: string; label: string }[] = [
    { value: 'AS', label: 'Assigned' },
    { value: 'PE', label: 'Pending' },
    { value: 'IP', label: 'In Progress' },
    { value: 'OH', label: 'On Hold' },
    { value: 'CAN', label: 'Cancelled' },
    { value: 'COM', label: 'Completed' },
];

export const PRIORITY_OPTIONS: { value: string; label: string }[] = [
    { value: 'High', label: 'High' },
    { value: 'Med', label: 'Medium' },
    { value: 'Low', label: 'Low' },
];

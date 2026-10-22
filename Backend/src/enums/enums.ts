import defineEnum from './define.ts';

const _state = defineEnum([
    { value: 'A', name: 'Active', description: 'Active' },
    { value: 'I', name: 'InActive', description: 'In Active' },
]);

const _memberType = defineEnum([
    { value: 'ADMIN', name: 'Admin', description: 'Admin User' },
    { value: 'VIEWER', name: 'Viewer', description: 'Only View' },
    { value: 'USER', name: 'User', description: 'General User' },
]);

const _roles = defineEnum([
    { value: 'HR', name: 'HumanResources', description: 'Human Resources' },
    { value: 'PM', name: 'ProjectManager', description: 'Project Manager' },
    { value: 'TL', name: 'TeamLeader', description: 'Team Leader' },
    { value: 'DEV', name: 'Developer', description: 'Developer' },
    { value: 'QA', name: 'QualityAssurance', description: 'Quality Assurance' },
    { value: 'BA', name: 'BusinessAnalyst', description: 'Business Analyst' },
    { value: 'TEST', name: 'Tester', description: 'Tester' },
    { value: 'OPS', name: 'DevOps', description: 'DevOps' },
]);

const _entity = defineEnum([
    { value: 'User', name: 'User', description: 'User' },
    { value: 'Project', name: 'Project', description: 'Project' },
    { value: 'Task', name: 'Task', description: 'Task' },
    { value: 'Comment', name: 'Comment', description: 'Comment' },
    { value: 'File', name: 'File', description: 'File' },
    { value: 'Notification', name: 'Notification', description: 'Notification' },
    { value: 'Activity', name: 'Activity', description: 'Activity' },
    { value: 'Meeting', name: 'Meeting', description: 'Meeting' },
    { value: 'Issue', name: 'Issue', description: 'Issue' },
    { value: 'Workflow', name: 'Workflow', description: 'Workflow' },
    { value: 'AuditLog', name: 'AuditLog', description: 'Audit Log' },
]);

const _priority = defineEnum([
    { value: 'High', name: 'High', description: 'High Priority' },
    { value: 'Med', name: 'Medium', description: 'Medium Priority' },
    { value: 'Low', name: 'Low', description: 'Low Priority' },
]);

const _status = defineEnum([
    { value: 'AS', name: 'Assigned', description: 'Assigned' },
    { value: 'PE', name: 'Pending', description: 'Pending' },
    { value: 'IP', name: 'InProgress', description: 'In Progress' },
    { value: 'OH', name: 'OnHold', description: 'On Hold' },
    { value: 'CAN', name: 'Cancelled', description: 'Cancelled' },
    { value: 'COM', name: 'Completed', description: 'Completed' },
]);

const _actions = defineEnum([
    { value: 'CREATE', name: 'Create', description: 'Create Action' },
    { value: 'UPDATE', name: 'Update', description: 'Update Action' },
    { value: 'DELETE', name: 'Delete', description: 'Delete Action' },
    { value: 'ARCHIVE', name: 'Archive', description: 'Archive Action' },
    { value: 'RESTORE', name: 'Restore', description: 'Restore Action' },
]);

export {
    _state as State,
    _memberType as MemberType,
    _roles as Roles,
    _entity as Entity,
    _priority as Priority,
    _status as Status,
    _actions as Actions,
};

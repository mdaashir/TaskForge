import ExcelJS from 'exceljs';
import { Priority, Status } from '../enums/enums.ts';
import projectModel from '../models/Project.ts';
import taskModel from '../models/Task.ts';
import type { IUser } from '../types.ts';
import projectService from './projectService.ts';
import taskService from './taskService.ts';

const label = (options: Record<string, string>, value: string) => options[value] ?? value;

const nameOf = (value: unknown): string => {
    if (value && typeof value === 'object' && 'name' in value) {
        return String((value as { name: unknown }).name);
    }
    return '';
};

const dateStamp = () => new Date().toISOString().slice(0, 10);

const newWorkbook = (sheetName: string) => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'TaskForge';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet(sheetName);
    return { workbook, sheet };
};

const styleSheet = (sheet: ExcelJS.Worksheet, dateKeys: string[]) => {
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    for (const key of dateKeys) sheet.getColumn(key).numFmt = 'yyyy-mm-dd';
};

async function tasksWorkbook(
    actor: IUser,
    options: { search?: string; projectId?: string; status?: string } = {}
) {
    try {
        const filter = await taskService.buildFilter(actor, options);
        const tasks = await taskModel
            .find(filter)
            .populate('projectId', 'name')
            .populate('assignedTo', 'name')
            .sort({ createdAt: -1 });

        const { workbook, sheet } = newWorkbook('Tasks');
        sheet.columns = [
            { header: 'Title', key: 'title', width: 34 },
            { header: 'Project', key: 'project', width: 24 },
            { header: 'Status', key: 'status', width: 16 },
            { header: 'Priority', key: 'priority', width: 16 },
            { header: 'Due date', key: 'dueDate', width: 14 },
            { header: 'Assignees', key: 'assignees', width: 28 },
            { header: 'Progress %', key: 'progress', width: 12 },
            { header: 'Created', key: 'createdAt', width: 20 },
            { header: 'Updated', key: 'updatedAt', width: 20 },
        ];

        for (const task of tasks) {
            sheet.addRow({
                title: task.title,
                project: nameOf(task.projectId),
                status: label(Status.descriptions, task.status),
                priority: label(Priority.descriptions, task.priority),
                dueDate: task.dueDate ?? null,
                assignees: (task.assignedTo ?? []).map(nameOf).filter(Boolean).join(', '),
                progress: task.progress,
                createdAt: task.createdAt ?? null,
                updatedAt: task.updatedAt ?? null,
            });
        }

        styleSheet(sheet, ['dueDate', 'createdAt', 'updatedAt']);

        const buffer = await workbook.xlsx.writeBuffer();
        return { buffer: Buffer.from(buffer), filename: `tasks-${dateStamp()}.xlsx` };
    } catch (error) {
        return error instanceof Error
            ? { message: 'Error building the tasks report', error: error.message }
            : { message: 'An unknown error occurred while building the tasks report.' };
    }
}

async function projectsWorkbook(actor: IUser, options: { search?: string; status?: string } = {}) {
    try {
        const filter = projectService.buildFilter(actor, options);
        const projects = await projectModel
            .find(filter)
            .populate('owner', 'name')
            .populate('members', 'name')
            .sort({ createdAt: -1 });

        const { workbook, sheet } = newWorkbook('Projects');
        sheet.columns = [
            { header: 'Name', key: 'name', width: 30 },
            { header: 'Owner', key: 'owner', width: 22 },
            { header: 'Members', key: 'members', width: 32 },
            { header: 'Status', key: 'status', width: 16 },
            { header: 'Priority', key: 'priority', width: 16 },
            { header: 'Progress %', key: 'progress', width: 12 },
            { header: 'Start', key: 'startDate', width: 14 },
            { header: 'End', key: 'endDate', width: 14 },
            { header: 'Created', key: 'createdAt', width: 20 },
        ];

        for (const project of projects) {
            sheet.addRow({
                name: project.name,
                owner: nameOf(project.owner),
                members: (project.members ?? []).map(nameOf).filter(Boolean).join(', '),
                status: label(Status.descriptions, project.status),
                priority: label(Priority.descriptions, project.priority),
                progress: project.progress,
                startDate: project.startDate ?? null,
                endDate: project.endDate ?? null,
                createdAt: project.createdAt ?? null,
            });
        }

        styleSheet(sheet, ['startDate', 'endDate', 'createdAt']);

        const buffer = await workbook.xlsx.writeBuffer();
        return { buffer: Buffer.from(buffer), filename: `projects-${dateStamp()}.xlsx` };
    } catch (error) {
        return error instanceof Error
            ? { message: 'Error building the projects report', error: error.message }
            : { message: 'An unknown error occurred while building the projects report.' };
    }
}

export default { tasksWorkbook, projectsWorkbook };

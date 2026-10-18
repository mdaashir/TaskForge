import type { FilterQuery } from 'mongoose';
import { Status } from '../enums/enums.ts';
import projectModel from '../models/Project.ts';
import taskModel from '../models/Task.ts';
import userModel from '../models/User.ts';
import type { IProject, ITask, IUser } from '../types.ts';
import { isAdmin } from '../utils/access.ts';
import projectService from './projectService.ts';

const toStatusCounts = (rows: { _id: string; count: number }[]) =>
    Status.list().map((status) => ({
        status,
        count: rows.find((row) => row._id === status)?.count ?? 0,
    }));

async function getDashboard(actor: IUser) {
    try {
        const admin = isAdmin(actor);

        const projectFilter: FilterQuery<IProject> = { archived: { $ne: true } };
        const taskFilter: FilterQuery<ITask> = { archived: { $ne: true } };

        if (!admin) {
            projectFilter.$or = [{ owner: actor._id }, { members: actor._id }];
            taskFilter.projectId = { $in: await projectService.visibleIds(actor) };
        }

        const overdueFilter: FilterQuery<ITask> = {
            ...taskFilter,
            dueDate: { $ne: null, $lt: new Date() },
            status: { $nin: [String(Status.Completed), String(Status.Cancelled)] },
        };

        const [
            users,
            projects,
            tasks,
            assignedToMe,
            overdue,
            tasksByStatus,
            projectsByStatus,
            recentTasks,
        ] = await Promise.all([
            admin
                ? userModel.countDocuments({ archived: { $ne: true } })
                : Promise.resolve(null),
            projectModel.countDocuments(projectFilter),
            taskModel.countDocuments(taskFilter),
            taskModel.countDocuments({ ...taskFilter, assignedTo: actor._id }),
            taskModel.countDocuments(overdueFilter),
            taskModel.aggregate<{ _id: string; count: number }>([
                { $match: taskFilter },
                { $group: { _id: '$status', count: { $sum: 1 } } },
            ]),
            projectModel.aggregate<{ _id: string; count: number }>([
                { $match: projectFilter },
                { $group: { _id: '$status', count: { $sum: 1 } } },
            ]),
            taskModel
                .find(taskFilter)
                .populate('projectId', 'name')
                .populate('assignedTo', 'name email')
                .sort({ updatedAt: -1 })
                .limit(5),
        ]);

        return {
            scope: admin ? 'admin' : 'member',
            totals: { users, projects, tasks, assignedToMe, overdue },
            tasksByStatus: toStatusCounts(tasksByStatus),
            projectsByStatus: toStatusCounts(projectsByStatus),
            recentTasks,
        };
    } catch (error) {
        return error instanceof Error
            ? { message: 'Error building the dashboard', error: error.message }
            : { message: 'An unknown error occurred while building the dashboard.' };
    }
}

export default { getDashboard };

import { Types, type FilterQuery } from 'mongoose';
import { Actions, Entity } from '../enums/enums.ts';
import projectModel from '../models/Project.ts';
import workflowModel from '../models/WorkFlow.ts';
import type { IUser, IWorkFlow } from '../types.ts';
import { canViewProject, idOf, isAdmin } from '../utils/access.ts';
import auditService from './auditService.ts';

const PEOPLE = 'name email memberType';
const PROJECT = 'name status progress';
const PARENT = 'name';

const accessDenied = () => ({ message: 'Access denied.', forbidden: true as const });
const notFound = () => ({ message: 'Workflow not found.' });
const invalidId = () => ({ message: 'Invalid workflow ID.' });
const invalid = (message: string) => ({ message, invalid: true as const });

const isOwner = (workflow: IWorkFlow, actor: IUser) => idOf(workflow.owner) === idOf(actor._id);
const isMember = (workflow: IWorkFlow, actor: IUser) =>
    (workflow.members ?? []).some((member) => idOf(member) === idOf(actor._id));

const canViewWorkflow = (workflow: IWorkFlow, actor: IUser) =>
    isAdmin(actor) || isOwner(workflow, actor) || isMember(workflow, actor);

const canDeleteWorkflow = (workflow: IWorkFlow, actor: IUser) =>
    isAdmin(actor) || isOwner(workflow, actor);

type LinkedProject = { progress?: number };

/** Progress is derived: the average of the linked projects, 0 when none are linked. */
const withProgress = (workflow: IWorkFlow) => {
    const plain = workflow.toObject() as Record<string, unknown> & { project?: unknown[] };
    const linked = (plain.project ?? []) as LinkedProject[];
    const values = linked
        .map((project) => project.progress)
        .filter((value): value is number => typeof value === 'number');

    const progress = values.length
        ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
        : 0;

    return { ...plain, progress };
};

interface WorkflowQuery {
    search?: string;
    status?: string;
    parentId?: string;
}

function buildFilter(actor: IUser, options: WorkflowQuery = {}): FilterQuery<IWorkFlow> {
    const conditions: FilterQuery<IWorkFlow>[] = [];
    if (!isAdmin(actor)) {
        conditions.push({ $or: [{ owner: actor._id }, { members: actor._id }] });
    }
    if (options.search) {
        const escaped = options.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp(escaped, 'i');
        conditions.push({ $or: [{ name: pattern }, { description: pattern }] });
    }
    if (options.status) conditions.push({ status: options.status });
    if (options.parentId === 'root') {
        conditions.push({ $or: [{ parentId: null }, { parentId: { $exists: false } }] });
    } else if (options.parentId) {
        conditions.push({ parentId: options.parentId });
    }

    return conditions.length === 0 ? {} : conditions.length === 1 ? conditions[0] : { $and: conditions };
}

async function getAll(
    actor: IUser,
    options: WorkflowQuery & { page?: number; limit?: number } = {}
) {
    try {
        const page = Math.max(1, options.page ?? 1);
        const limit = Math.min(100, Math.max(1, options.limit ?? 20));
        const filter = buildFilter(actor, options);

        const [workflows, total] = await Promise.all([
            workflowModel
                .find(filter)
                .populate('owner', PEOPLE)
                .populate('members', PEOPLE)
                .populate('project', PROJECT)
                .populate('parentId', PARENT)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            workflowModel.countDocuments(filter),
        ]);

        return { workflows: workflows.map(withProgress), total, page, limit };
    } catch (error) {
        return error instanceof Error
            ? { message: 'Error fetching workflows', error: error.message }
            : { message: 'An unknown error occurred while fetching workflows.' };
    }
}

async function getOne(workflowId: Types.ObjectId, actor: IUser) {
    try {
        if (!Types.ObjectId.isValid(workflowId)) return invalidId();
        const workflow = await workflowModel
            .findById(workflowId)
            .populate('owner', PEOPLE)
            .populate('members', PEOPLE)
            .populate('project', PROJECT)
            .populate('parentId', PARENT)
            .populate('children', 'name status progress');

        if (!workflow) return notFound();
        if (!canViewWorkflow(workflow, actor)) return accessDenied();
        return { workflow: withProgress(workflow) };
    } catch (error) {
        return error instanceof Error
            ? { message: 'Error fetching workflow', error: error.message }
            : { message: 'An unknown error occurred while fetching the workflow.' };
    }
}

async function validateProjects(
    ids: (Types.ObjectId | string)[] | undefined,
    actor: IUser
) {
    if (!ids || ids.length === 0) return null;

    const unique = [...new Set(ids.map((id) => String(id)))];
    const projects = await projectModel.find({ _id: { $in: unique } });

    if (projects.length !== unique.length) {
        return invalid('One or more linked projects were not found.');
    }
    if (projects.some((project) => !canViewProject(project, actor))) {
        return invalid('You do not have access to one of the linked projects.');
    }
    return null;
}

async function wouldCreateCycle(workflowId: Types.ObjectId, parentId: Types.ObjectId) {
    let current: Types.ObjectId | null = parentId;
    const seen = new Set<string>();

    while (current) {
        const id = String(current);
        if (id === String(workflowId) || seen.has(id)) return true;
        seen.add(id);

        const node: { parentId?: Types.ObjectId | null } | null = await workflowModel
            .findById(current)
            .select('parentId')
            .lean()
            .exec();
        if (!node) return false;
        current = node.parentId ?? null;
    }

    return false;
}

async function create(data: Partial<IWorkFlow>, actor: IUser) {
    try {
        const payload: Partial<IWorkFlow> = { ...data };
        if (!isAdmin(actor) || !payload.owner) payload.owner = actor._id as Types.ObjectId;
        payload.createdBy = actor._id as Types.ObjectId;
        delete payload.progress;

        if (payload.parentId) {
            const parent = await workflowModel.findById(payload.parentId);
            if (!parent) return invalid('Parent workflow not found.');
            if (!canViewWorkflow(parent, actor)) return accessDenied();
        }

        const projectProblem = await validateProjects(payload.project, actor);
        if (projectProblem) return projectProblem;

        const workflow = new workflowModel(payload);
        await workflow.validate();
        const result = await workflow.save();

        if (result.parentId) {
            await workflowModel.updateOne(
                { _id: result.parentId },
                { $push: { children: result._id } }
            );
        }

        await auditService.record({
            actor,
            action: String(Actions.Create),
            entity: String(Entity.Workflow),
            targetId: result._id as Types.ObjectId,
            newData: result,
        });

        return { workflow: result };
    } catch (error) {
        return error instanceof Error
            ? { message: 'Invalid workflow data', error: error.message }
            : { message: 'An unknown error occurred while creating the workflow.' };
    }
}

async function update(workflowId: Types.ObjectId, data: Partial<IWorkFlow>, actor: IUser) {
    try {
        if (!Types.ObjectId.isValid(workflowId)) return invalidId();
        const workflow = await workflowModel.findById(workflowId);
        if (!workflow) return notFound();
        if (!canViewWorkflow(workflow, actor)) return accessDenied();

        const patch: Partial<IWorkFlow> = { ...data };
        if (!isAdmin(actor)) delete patch.owner;
        delete patch.progress;

        if (patch.project) {
            const projectProblem = await validateProjects(patch.project, actor);
            if (projectProblem) return projectProblem;
        }

        const previousParent = workflow.parentId ? String(workflow.parentId) : null;
        const nextParent =
            'parentId' in patch
                ? patch.parentId
                    ? String(patch.parentId)
                    : null
                : previousParent;

        if (nextParent && nextParent !== previousParent) {
            if (nextParent === String(workflow._id)) {
                return invalid('A workflow cannot be its own parent.');
            }

            const parent = await workflowModel.findById(nextParent);
            if (!parent) return invalid('Parent workflow not found.');
            if (!canViewWorkflow(parent, actor)) return accessDenied();
            if (await wouldCreateCycle(workflow._id as Types.ObjectId, parent._id as Types.ObjectId)) {
                return invalid('That move would create a cycle.');
            }
        }

        const before = workflow.toObject();
        Object.assign(workflow, patch);
        workflow.updatedBy = actor._id as Types.ObjectId;
        await workflow.validate();
        const result = await workflow.save();

        if (nextParent !== previousParent) {
            if (previousParent) {
                await workflowModel.updateOne(
                    { _id: previousParent },
                    { $pull: { children: result._id } }
                );
            }
            if (nextParent) {
                await workflowModel.updateOne(
                    { _id: nextParent },
                    { $push: { children: result._id } }
                );
            }
        }

        const { oldData, newData } = auditService.diff(before, result);
        if (oldData || newData) {
            await auditService.record({
                actor,
                action: String(Actions.Update),
                entity: String(Entity.Workflow),
                targetId: result._id as Types.ObjectId,
                oldData,
                newData,
            });
        }

        return { workflow: result };
    } catch (error) {
        return error instanceof Error
            ? { message: 'Invalid workflow data', error: error.message }
            : { message: 'An unknown error occurred while updating the workflow.' };
    }
}

async function remove(workflowId: Types.ObjectId, actor: IUser) {
    try {
        if (!Types.ObjectId.isValid(workflowId)) return invalidId();
        const workflow = await workflowModel.findById(workflowId);
        if (!workflow) return notFound();
        if (!canDeleteWorkflow(workflow, actor)) return accessDenied();

        const childCount = await workflowModel.countDocuments({ parentId: workflow._id });
        if (childCount > 0) {
            return invalid(
                `Delete or reparent its ${childCount} child workflow${childCount === 1 ? '' : 's'} first.`
            );
        }

        const before = workflow.toObject();
        const parentId = workflow.parentId;
        const workflowDocId = workflow._id;

        await workflow.deleteOne();
        if (parentId) {
            await workflowModel.updateOne(
                { _id: parentId },
                { $pull: { children: workflowDocId } }
            );
        }

        await auditService.record({
            actor,
            action: String(Actions.Delete),
            entity: String(Entity.Workflow),
            targetId: workflowDocId as Types.ObjectId,
            oldData: before,
        });

        return { success: true as const };
    } catch (error) {
        return error instanceof Error
            ? { message: 'Error deleting workflow', error: error.message }
            : { message: 'An unknown error occurred while deleting the workflow.' };
    }
}

export default { getAll, buildFilter, getOne, create, update, remove };

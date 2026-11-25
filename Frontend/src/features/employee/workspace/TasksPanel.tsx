import { Plus, Search, Upload } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router';

import {
    useDeleteTaskMutation,
    useReorderTasksMutation,
    useSetTaskAssigneeMutation,
    useSetTaskPriorityMutation,
} from '@/api/endpoints/employeeProject';
import { useSetTaskStatusMutation } from '@/api/endpoints/employee';
import type { Priority } from '@/api/employee-types';
import type { ProjectDetail, TaskItem } from '@/api/project-types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { CompleteTaskDialog } from '@/features/employee/components/CompleteTaskDialog';
import { usePermissions } from '@/hooks/usePermissions';
import { useRun } from '@/hooks/useRun';
import { cn } from '@/lib/utils';
import { usePhaseLabel } from '@/hooks/usePhaseLabel';

import { TaskBoard } from './TaskBoard';
import { TaskDetailsDialog } from './TaskDetailsDialog';
import { TaskEditor } from './TaskEditor';
import { TaskTable, type TableActions } from './TaskTable';

export type TaskView = 'list' | 'priority' | 'board';

const PRIORITY_RANK: Record<string, number> = {
    urgent: 0,
    high: 1,
    normal: 2,
    low: 3,
};

/** The task views of the single tab line: List, Priority and Board. */
export function TasksPanel({
    detail,
    locked,
    view,
}: {
    detail: ProjectDetail;
    locked: boolean;
    view: TaskView;
}) {
    const { t } = usePhaseLabel();
    const { can } = usePermissions();
    const run = useRun();
    const projectId = detail.project.id;
    const [search, setSearch] = useState('');
    const [editing, setEditing] = useState<TaskItem | null>(null);
    const [creating, setCreating] = useState(false);
    const [completing, setCompleting] = useState<TaskItem | null>(null);
    const [deleting, setDeleting] = useState<TaskItem | null>(null);
    const [viewing, setViewing] = useState<TaskItem | null>(null);
    const [setStatus, { isLoading: savingStatus }] = useSetTaskStatusMutation();
    const [setPriority] = useSetTaskPriorityMutation();
    const [setAssignee] = useSetTaskAssigneeMutation();
    const [reorder] = useReorderTasksMutation();
    const [deleteTask, { isLoading: deletingTask }] = useDeleteTaskMutation();

    const canToggle = can('employee-projects.tasks.toggle') && !locked;
    const canCreate = can('employee-projects.tasks.create') && !locked;
    const canUpdate = can('employee-projects.tasks.update') && !locked;
    const canDelete = can('employee-projects.tasks.delete') && !locked;
    const isOwner = detail.project.is_project_owner;

    const all = detail.project.tasks;
    const team = detail.project.team_developers;
    const assigned = useMemo(
        () => team.filter((developer) => developer.assigned),
        [team],
    );
    const flags = useMemo(
        () => ({ canToggle, canUpdate, canDelete, isOwner, locked }),
        [canToggle, canUpdate, canDelete, isOwner, locked],
    );

    // Resolved from the live list, so a change made in the dialog shows at once.
    const viewed = viewing
        ? (all.find((task) => task.id === viewing.id) ?? null)
        : null;

    const changeStatus = useCallback(
        (task: TaskItem, status: TaskItem['status']) => {
            if (status === 'completed') {
                setCompleting(task);
            } else if (task.status !== status) {
                void run(setStatus({ taskId: task.id, projectId, status }));
            }
        },
        [run, setStatus, projectId],
    );
    const changePriority = useCallback(
        (task: TaskItem, priority: Priority | null) =>
            void run(setPriority({ projectId, taskId: task.id, priority }), ''),
        [run, setPriority, projectId],
    );
    const assign = useCallback(
        (task: TaskItem, developerId: number | null) =>
            void run(
                setAssignee({
                    projectId,
                    taskId: task.id,
                    assigned_developer_id: developerId,
                }),
            ),
        [run, setAssignee, projectId],
    );

    const actions: TableActions = {
        status: changeStatus,
        priority: changePriority,
        assign,
        details: setViewing,
        edit: setEditing,
        remove: setDeleting,
    };

    const priorityTasks = useMemo(
        () =>
            all
                .filter((task) => task.priority !== null)
                .sort(
                    (a, b) =>
                        PRIORITY_RANK[a.priority ?? 'low'] -
                        PRIORITY_RANK[b.priority ?? 'low'],
                ),
        [all],
    );

    const boardTasks = useMemo(() => {
        const term = search.trim().toLowerCase();

        return term === ''
            ? all
            : all.filter((task) =>
                  `${task.task_code ?? ''} ${task.title}`
                      .toLowerCase()
                      .includes(term),
              );
    }, [all, search]);

    const header = (
        <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-500">
                {locked
                    ? t('This phase is completed, tasks are read only.')
                    : `${detail.project.pending_tasks_count} pending / ${detail.project.completed_tasks_count} completed`}
            </p>
            <div className="flex flex-wrap gap-2">
                {can('employee-projects.tasks.create') ? (
                    <Button asChild variant="outline" size="sm">
                        <Link to={`/my-projects/${projectId}/bulk-upload`}>
                            <Upload className="size-4" /> Bulk upload
                        </Link>
                    </Button>
                ) : null}
                {canCreate ? (
                    <Button size="sm" onClick={() => setCreating(true)}>
                        <Plus className="size-4" /> Add task
                    </Button>
                ) : null}
            </div>
        </div>
    );

    return (
        <div className="space-y-3">
            {header}

            {all.length === 0 ? (
                <Card variant="flush">
                    <EmptyState
                        title="No tasks yet"
                        description="Tasks assigned to you or created by you appear here."
                    />
                </Card>
            ) : view === 'list' ? (
                <TaskTable
                    tasks={all}
                    milestones={detail.milestones}
                    team={assigned}
                    flags={flags}
                    actions={actions}
                />
            ) : view === 'priority' ? (
                priorityTasks.length === 0 ? (
                    <Card variant="flush">
                        <EmptyState title="No priority tasks yet" />
                    </Card>
                ) : (
                    <TaskTable
                        tasks={priorityTasks}
                        milestones={detail.milestones}
                        team={assigned}
                        flags={flags}
                        actions={actions}
                        filters={false}
                    />
                )
            ) : (
                <div className="space-y-3">
                    <label className="relative block sm:ml-auto sm:w-56">
                        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-slate-400" />
                        <input
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search task name..."
                            aria-label="Search tasks"
                            className={cn(
                                'h-8 w-full rounded-md border border-slate-200 bg-white pl-8 text-xs text-slate-700 outline-none focus:border-brand',
                            )}
                        />
                    </label>
                    <TaskBoard
                        tasks={boardTasks}
                        canToggle={canToggle}
                        canUpdate={canUpdate}
                        canDelete={canDelete}
                        isOwner={isOwner}
                        team={assigned}
                        actions={{
                            setStatus: (task, status) =>
                                changeStatus(task, status),
                            complete: setCompleting,
                            reorder: (task, before) => {
                                const ids = all
                                    .map((item) => item.id)
                                    .filter((id) => id !== task.id);

                                ids.splice(ids.indexOf(before.id), 0, task.id);
                                void run(
                                    reorder({ projectId, ordered_ids: ids }),
                                    '',
                                );
                            },
                            priority: changePriority,
                            assign,
                            edit: setEditing,
                            remove: setDeleting,
                        }}
                    />
                </div>
            )}

            <TaskDetailsDialog
                task={viewed}
                onClose={() => setViewing(null)}
                canUpdate={canUpdate}
                canDelete={canDelete}
                isOwner={isOwner}
                team={assigned}
                actions={{
                    priority: changePriority,
                    assign,
                    edit: setEditing,
                    remove: setDeleting,
                }}
            />
            <TaskEditor
                detail={detail}
                task={editing}
                open={creating || editing !== null}
                onClose={() => {
                    setCreating(false);
                    setEditing(null);
                }}
            />
            <CompleteTaskDialog
                taskTitle={completing?.title ?? null}
                estimatedHours={completing?.estimated_hours ?? null}
                loading={savingStatus}
                onClose={() => setCompleting(null)}
                onSubmit={async (timeEntry) => {
                    if (
                        completing &&
                        (await run(
                            setStatus({
                                taskId: completing.id,
                                projectId,
                                status: 'completed',
                                time_entry: timeEntry,
                            }),
                        ))
                    ) {
                        setCompleting(null);
                    }
                }}
            />
            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                destructive
                title="Delete task?"
                description={
                    deleting
                        ? `"${deleting.title}" will be removed from this project.`
                        : ''
                }
                confirmLabel="Delete"
                loading={deletingTask}
                onConfirm={async () => {
                    if (
                        deleting &&
                        (await run(
                            deleteTask({ projectId, taskId: deleting.id }),
                        ))
                    ) {
                        setDeleting(null);
                    }
                }}
            />
        </div>
    );
}

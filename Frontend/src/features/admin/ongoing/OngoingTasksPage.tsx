import {
    CornerDownRight,
    MoreHorizontal,
    Pencil,
    Plus,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';

import type { Priority } from '@/api/employee-types';
import {
    useCarryOverOngoingTaskMutation,
    useDeleteOngoingTaskMutation,
    useGetOngoingListQuery,
} from '@/api/endpoints/ongoingTasks';
import type { OngoingListProject, OngoingListTask } from '@/api/ongoing-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ErrorState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { currentMonth } from '@/features/admin/general/month';
import { MonthField } from '@/features/admin/general/shared';
import { PageHeader } from '@/features/admin/org/shared';
import { TaskForm } from '@/features/ongoing/TaskForm';
import { PriorityBadge } from '@/features/employee/workspace/shared';
import { usePermissions } from '@/hooks/usePermissions';
import { useRun } from '@/hooks/useRun';
import { formatDate } from '@/lib/date';

/**
 * Every ongoing task across projects: filter by project, employee, creator and status, see who
 * created each one, and add a task to any project that has the feature on.
 */
export function OngoingTasksPage() {
    const { can } = usePermissions();
    const run = useRun();
    const [params, setParams] = useSearchParams();
    const month = params.get('month') ?? currentMonth();
    const projectId = params.get('project_id') ?? '';
    const developerId = params.get('developer_id') ?? '';
    const createdBy = params.get('created_by') ?? '';
    const status = params.get('status') ?? '';
    const { data, isLoading, isError, refetch } = useGetOngoingListQuery({
        month,
        project_id: projectId || undefined,
        developer_id: developerId || undefined,
        created_by: createdBy || undefined,
        status: status || undefined,
    });
    const [removeTask] = useDeleteOngoingTaskMutation();
    const [carryTask] = useCarryOverOngoingTaskMutation();
    const [editing, setEditing] = useState<OngoingListTask | 'new' | null>(
        null,
    );
    const [deleting, setDeleting] = useState<OngoingListTask | null>(null);
    const canAssign = can('projects.ongoing.assign');

    const set = (next: Record<string, string | null>) => {
        const copy = new URLSearchParams(params);

        for (const [key, value] of Object.entries(next)) {
            if (value) {
                copy.set(key, value);
            } else {
                copy.delete(key);
            }
        }

        setParams(copy, { replace: true });
    };

    const columns: Column<OngoingListTask>[] = [
        {
            key: 'title',
            header: 'Task',
            primary: true,
            cell: (task) => (
                <div className="min-w-0">
                    <p className="truncate font-bold text-slate-900">
                        {task.title}
                    </p>
                    <p className="truncate text-xs font-normal text-slate-500">
                        {task.assignee
                            ? `${task.assignee.name} (${task.assignee.developer_code})`
                            : 'Unassigned'}
                    </p>
                </div>
            ),
        },
        {
            key: 'project',
            header: 'Project',
            cell: (task) =>
                task.project ? (
                    <Link
                        to={`/admin/projects/${task.project.id}?tab=ongoing`}
                        className="text-xs font-bold text-brand-600 hover:underline"
                    >
                        {task.project.name}{' '}
                        <span className="font-normal text-slate-500">
                            {task.project.project_code}
                        </span>
                    </Link>
                ) : null,
        },
        {
            key: 'created_by',
            header: 'Created by',
            cell: (task) => (
                <span className="text-xs">{task.created_by ?? '—'}</span>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            cell: (task) => (
                <div className="flex flex-wrap gap-1">
                    <Badge
                        tone={
                            task.status === 'completed'
                                ? 'success'
                                : task.is_missed || task.is_overdue
                                  ? 'danger'
                                  : 'warning'
                        }
                    >
                        {task.status === 'completed'
                            ? 'Completed'
                            : task.is_missed
                              ? 'Missed'
                              : task.is_overdue
                                ? 'Overdue'
                                : 'Pending'}
                    </Badge>
                    <PriorityBadge
                        priority={task.priority as Priority | null}
                    />
                    {task.carried_over ? (
                        <Badge tone="info">Carried over</Badge>
                    ) : null}
                </div>
            ),
        },
        {
            key: 'deadline',
            header: 'Deadline',
            cell: (task) => (
                <span className="text-xs">{formatDate(task.deadline)}</span>
            ),
        },
        {
            key: 'actions',
            header: '',
            className: 'w-12',
            cell: (task) =>
                canAssign && (!task.is_locked || task.can_carry_over) ? (
                    <div onClick={(event) => event.stopPropagation()}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Actions for ${task.title}`}
                                >
                                    <MoreHorizontal className="size-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                {task.can_carry_over ? (
                                    <DropdownMenuItem
                                        onSelect={() =>
                                            void run(
                                                carryTask(task.id),
                                                'Task carried over to the next month.',
                                            )
                                        }
                                    >
                                        <CornerDownRight className="size-4" />{' '}
                                        Carry over
                                    </DropdownMenuItem>
                                ) : null}
                                {!task.is_locked ? (
                                    <>
                                        <DropdownMenuItem
                                            onSelect={() => setEditing(task)}
                                        >
                                            <Pencil className="size-4" /> Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            destructive
                                            onSelect={() => setDeleting(task)}
                                        >
                                            <Trash2 className="size-4" /> Delete
                                        </DropdownMenuItem>
                                    </>
                                ) : null}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                ) : null,
        },
    ];

    if (isError) {
        return (
            <ErrorState
                title="Could not load ongoing tasks"
                action={
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => refetch()}
                    >
                        Try again
                    </Button>
                }
            />
        );
    }

    const projects = data?.projects ?? [];

    return (
        <div className="space-y-5">
            <PageHeader
                title="Ongoing tasks"
                description="Continuous work across projects, with who created each task."
                action={
                    canAssign ? (
                        <Button onClick={() => setEditing('new')}>
                            <Plus className="size-4" /> Add task
                        </Button>
                    ) : null
                }
            />
            <FilterBar
                activeCount={
                    Number(Boolean(projectId)) +
                    Number(Boolean(developerId)) +
                    Number(Boolean(createdBy)) +
                    Number(Boolean(status))
                }
                onReset={() =>
                    set({
                        project_id: null,
                        developer_id: null,
                        created_by: null,
                        status: null,
                    })
                }
            >
                <MonthField
                    value={month}
                    onChange={(value) => set({ month: value })}
                />
                <Field label="Project" className="lg:w-52">
                    <Select
                        density="compact"
                        value={projectId || 'all'}
                        onValueChange={(value) =>
                            set({ project_id: value === 'all' ? null : value })
                        }
                        options={[
                            { value: 'all', label: 'All projects' },
                            ...projects.map((project) => ({
                                value: String(project.id),
                                label: `${project.name} (${project.project_code})`,
                            })),
                        ]}
                    />
                </Field>
                <Field label="Employee" className="lg:w-52">
                    <Select
                        density="compact"
                        value={developerId || 'all'}
                        onValueChange={(value) =>
                            set({
                                developer_id: value === 'all' ? null : value,
                            })
                        }
                        options={[
                            { value: 'all', label: 'All employees' },
                            ...(data?.developers ?? []).map((person) => ({
                                value: String(person.id),
                                label: `${person.name} (${person.developer_code})`,
                            })),
                        ]}
                    />
                </Field>
                <Field label="Created by" className="lg:w-48">
                    <Select
                        density="compact"
                        value={createdBy || 'all'}
                        onValueChange={(value) =>
                            set({ created_by: value === 'all' ? null : value })
                        }
                        options={[
                            { value: 'all', label: 'Anyone' },
                            ...(data?.creators ?? []).map((creator) => ({
                                value: String(creator.id),
                                label: creator.name,
                            })),
                        ]}
                    />
                </Field>
                <Field label="Status" className="lg:w-40">
                    <Select
                        density="compact"
                        value={status || 'all'}
                        onValueChange={(value) =>
                            set({ status: value === 'all' ? null : value })
                        }
                        options={[
                            { value: 'all', label: 'Any' },
                            { value: 'pending', label: 'Pending' },
                            { value: 'completed', label: 'Completed' },
                            { value: 'overdue', label: 'Overdue' },
                        ]}
                    />
                </Field>
            </FilterBar>
            <DataTable
                columns={columns}
                rows={data?.tasks}
                rowKey={(task) => task.id}
                loading={isLoading}
                emptyTitle="No ongoing tasks for these filters"
            />

            <Drawer
                open={editing !== null}
                onOpenChange={(open) => !open && setEditing(null)}
            >
                <DrawerContent
                    title={
                        editing === 'new' ? 'Add an ongoing task' : 'Edit task'
                    }
                >
                    {editing ? (
                        <ProjectTaskForm
                            key={editing === 'new' ? 'new' : editing.id}
                            task={editing === 'new' ? null : editing}
                            projects={projects}
                            onDone={() => setEditing(null)}
                        />
                    ) : null}
                </DrawerContent>
            </Drawer>

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                destructive
                title="Delete task?"
                description={
                    deleting ? `"${deleting.title}" will be removed.` : ''
                }
                confirmLabel="Delete"
                onConfirm={async () => {
                    if (deleting && (await run(removeTask(deleting.id)))) {
                        setDeleting(null);
                    }
                }}
            />
        </div>
    );
}

/** A new task starts by choosing its project (only those with the feature on); editing keeps it. */
function ProjectTaskForm({
    task,
    projects,
    onDone,
}: {
    task: OngoingListTask | null;
    projects: OngoingListProject[];
    onDone: () => void;
}) {
    const [chosen, setChosen] = useState(String(task?.project?.id ?? ''));
    const project = projects.find((item) => String(item.id) === chosen);

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            {task === null ? (
                <div className="border-b border-slate-100 p-5">
                    <Field label="Project" required>
                        <Select
                            value={chosen}
                            onValueChange={setChosen}
                            placeholder="Choose a project"
                            options={projects
                                .filter((item) => item.enabled)
                                .map((item) => ({
                                    value: String(item.id),
                                    label: `${item.name} (${item.project_code})`,
                                }))}
                        />
                    </Field>
                </div>
            ) : null}
            {project ? (
                <TaskForm
                    key={project.id}
                    projectId={project.id}
                    task={task}
                    people={project.members}
                    onDone={onDone}
                />
            ) : (
                <p className="p-5 text-sm text-slate-500">
                    Pick a project to see its ongoing team.
                </p>
            )}
        </div>
    );
}

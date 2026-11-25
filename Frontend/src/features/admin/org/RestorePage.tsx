import { RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';

import type { TrashedProject, TrashedTask } from '@/api/org-types';
import {
    useGetRestoreQuery,
    useRestoreItemMutation,
} from '@/api/endpoints/org';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable, type Column } from '@/components/ui/data-table';
import { ErrorState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePermissions } from '@/hooks/usePermissions';
import { useRun } from '@/hooks/useRun';
import { formatDateTime } from '@/lib/date';

import { PageHeader } from './shared';

const PER_PAGE = 12;

type Target =
    | { kind: 'projects'; item: TrashedProject; force: boolean }
    | { kind: 'tasks'; item: TrashedTask; force: boolean };

export function RestorePage() {
    const { can } = usePermissions();
    const run = useRun();
    const [params, setParams] = useSearchParams();
    const tab = params.get('tab') === 'tasks' ? 'tasks' : 'projects';
    const projectsPage = Number(params.get('projects_page') ?? 1);
    const tasksPage = Number(params.get('tasks_page') ?? 1);
    const { data, isLoading, isError, refetch } = useGetRestoreQuery({
        tab,
        projects_page: projectsPage,
        tasks_page: tasksPage,
    });
    const [restore, { isLoading: working }] = useRestoreItemMutation();
    const [target, setTarget] = useState<Target | null>(null);

    const set = (next: Record<string, string>) => {
        const copy = new URLSearchParams(params);

        for (const [key, value] of Object.entries(next)) {
            copy.set(key, value);
        }

        setParams(copy, { replace: true });
    };

    const actions = (
        kind: 'projects' | 'tasks',
        item: TrashedProject | TrashedTask,
        blocked = false,
    ) => (
        <div
            className="flex flex-wrap gap-2"
            onClick={(event) => event.stopPropagation()}
        >
            {can('restore.restore') ? (
                <Button
                    size="sm"
                    variant="outline"
                    disabled={blocked}
                    onClick={() =>
                        setTarget({ kind, item, force: false } as Target)
                    }
                >
                    <RotateCcw className="size-4" /> Restore
                </Button>
            ) : null}
            {can('restore.force-delete') ? (
                <Button
                    size="sm"
                    variant="destructiveSoft"
                    onClick={() =>
                        setTarget({ kind, item, force: true } as Target)
                    }
                >
                    <Trash2 className="size-4" /> Delete forever
                </Button>
            ) : null}
        </div>
    );

    const projectColumns: Column<TrashedProject>[] = [
        {
            key: 'name',
            header: 'Project',
            primary: true,
            cell: (project) => (
                <div className="min-w-0">
                    <p className="truncate font-bold text-slate-900">
                        {project.name}
                    </p>
                    <p className="truncate text-xs font-normal text-slate-500">
                        {project.project_code}
                    </p>
                </div>
            ),
        },
        {
            key: 'deleted',
            header: 'Deleted',
            cell: (project) => (
                <div className="text-xs">
                    <p>{formatDateTime(project.deleted_at)}</p>
                    <p className="text-slate-500">
                        {project.deleted_by ? `by ${project.deleted_by}` : ''}
                    </p>
                </div>
            ),
        },
        {
            key: 'content',
            header: 'Content',
            hideOnMobile: true,
            cell: (project) => (
                <span className="text-xs">
                    {project.total_tasks_count} task(s) · {project.phases_count}{' '}
                    phase(s)
                </span>
            ),
        },
        {
            key: 'actions',
            header: '',
            cell: (project) => actions('projects', project),
        },
    ];

    const taskColumns: Column<TrashedTask>[] = [
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
                        {task.task_code ?? 'No code'} ·{' '}
                        {task.project?.name ?? 'No project'}
                    </p>
                </div>
            ),
        },
        {
            key: 'deleted',
            header: 'Deleted',
            cell: (task) => (
                <span className="text-xs">
                    {formatDateTime(task.deleted_at)}
                </span>
            ),
        },
        {
            key: 'who',
            header: 'Assignee',
            hideOnMobile: true,
            cell: (task) => (
                <span className="text-xs">
                    {task.assigned_developer?.name ?? 'Unassigned'}
                </span>
            ),
        },
        {
            key: 'actions',
            header: '',
            cell: (task) =>
                task.project?.deleted_at ? (
                    <Badge tone="warning">Project is deleted</Badge>
                ) : (
                    actions('tasks', task)
                ),
        },
    ];

    if (isError) {
        return (
            <ErrorState
                title="Could not load deleted items"
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

    const pages = (count: number | undefined) =>
        Math.max(1, Math.ceil((count ?? 0) / PER_PAGE));

    return (
        <div className="space-y-5">
            <PageHeader
                title="Restore"
                description="Deleted projects and tasks. Restore them or remove them for good."
            />
            <Tabs value={tab} onValueChange={(value) => set({ tab: value })}>
                <TabsList>
                    <TabsTrigger value="projects">
                        Projects ({data?.projects_count ?? 0})
                    </TabsTrigger>
                    <TabsTrigger value="tasks">
                        Tasks ({data?.tasks_count ?? 0})
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="projects" className="space-y-3">
                    <DataTable
                        columns={projectColumns}
                        rows={data?.projects.data}
                        rowKey={(project) => project.id}
                        loading={isLoading}
                        emptyTitle="No deleted projects"
                    />
                    <Pagination
                        page={projectsPage}
                        pageCount={pages(data?.projects_count)}
                        total={data?.projects_count}
                        onPageChange={(next) =>
                            set({ projects_page: String(next) })
                        }
                    />
                </TabsContent>
                <TabsContent value="tasks" className="space-y-3">
                    <DataTable
                        columns={taskColumns}
                        rows={data?.tasks.data}
                        rowKey={(task) => task.id}
                        loading={isLoading}
                        emptyTitle="No deleted tasks"
                    />
                    <Pagination
                        page={tasksPage}
                        pageCount={pages(data?.tasks_count)}
                        total={data?.tasks_count}
                        onPageChange={(next) =>
                            set({ tasks_page: String(next) })
                        }
                    />
                </TabsContent>
            </Tabs>

            <ConfirmDialog
                open={target !== null}
                onOpenChange={(open) => !open && setTarget(null)}
                destructive={target?.force}
                title={target?.force ? 'Delete forever?' : 'Restore?'}
                description={
                    target
                        ? target.force
                            ? `"${'name' in target.item ? target.item.name : target.item.title}" and everything in it will be removed permanently. This cannot be undone.`
                            : `"${'name' in target.item ? target.item.name : target.item.title}" will be put back.`
                        : ''
                }
                confirmLabel={target?.force ? 'Delete forever' : 'Restore'}
                loading={working}
                onConfirm={async () => {
                    if (
                        target &&
                        (await run(
                            restore({
                                kind: target.kind,
                                id: target.item.id,
                                force: target.force,
                            }),
                        ))
                    ) {
                        setTarget(null);
                    }
                }}
            />
        </div>
    );
}

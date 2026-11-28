import {
    FolderOpen,
    Plus,
    Search,
    SquarePen,
    Trash2,
    TriangleAlert,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';

import { errorMessage } from '@/api/baseApi';
import type { AdminProjectRow } from '@/api/admin-project-types';
import {
    useCreateDriveFolderMutation,
    useDeleteAdminProjectMutation,
    useGetAdminProjectsQuery,
    useSetProjectOwnerMutation,
} from '@/api/endpoints/adminProjects';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable, type Column } from '@/components/ui/data-table';
import { ErrorState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { FilterBar } from '@/components/ui/filter-bar';
import { Input } from '@/components/ui/input';
import { Modal, ModalClose, ModalContent } from '@/components/ui/modal';
import { Pagination } from '@/components/ui/pagination';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Select } from '@/components/ui/select';
import { usePermissions } from '@/hooks/usePermissions';
import { useRun } from '@/hooks/useRun';
import { formatDate } from '@/lib/date';
import { statusTone } from '@/lib/projectStatus';
import { cn } from '@/lib/utils';
import { usePhaseLabel } from '@/hooks/usePhaseLabel';

import { ProjectFormDrawer } from './ProjectFormDrawer';

const STATUSES = [
    'In Progress',
    'Cancelled',
    'Failed',
    'Successful',
    'Paused/Hold',
    'In Review',
    'Payment Pending',
];

/** Only an In Progress project with an open version can be changed; every other status is frozen. */
function isEditable(project: AdminProjectRow): boolean {
    return (
        project.status === 'In Progress' &&
        project.current_phase !== null &&
        ['In Progress', 'In Review'].includes(project.current_phase.status)
    );
}

function pipelineRunning(
    project: AdminProjectRow,
    aiEnabled: boolean,
): boolean {
    return (
        project.prd_status === 'processing' ||
        (aiEnabled &&
            ['uploading', 'analyzing', 'creating_tasks'].includes(
                project.prd_ai_status,
            ))
    );
}

function pipelineLabel(project: AdminProjectRow): string {
    return project.prd_ai_status === 'creating_tasks'
        ? 'Generating tasks…'
        : project.prd_ai_status === 'analyzing'
          ? 'Analyzing PRD…'
          : 'Preparing PRD…';
}

export function ProjectsListPage() {
    const { phaseLabel } = usePhaseLabel();
    const { can } = usePermissions();
    const run = useRun();
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const search = params.get('search') ?? '';
    const [searchDraft, setSearchDraft] = useState(search);
    const query = {
        search: search || undefined,
        status: params.get('status') || undefined,
        department_id: params.get('department_id') || undefined,
        group_id: params.get('group_id') || undefined,
        assignment: params.get('assignment') || undefined,
        per_page: Number(params.get('per_page') ?? 25),
        page: Number(params.get('page') ?? 1),
    };
    const { data, isLoading, isFetching, isError, refetch } =
        useGetAdminProjectsQuery(query);
    const [editing, setEditing] = useState<AdminProjectRow | 'new' | null>(
        null,
    );
    const [deleting, setDeleting] = useState<AdminProjectRow | null>(null);
    const [owning, setOwning] = useState<AdminProjectRow | null>(null);
    const [ownerId, setOwnerId] = useState('none');
    const [remove, { isLoading: removing }] = useDeleteAdminProjectMutation();
    const [saveOwner, { isLoading: savingOwner }] =
        useSetProjectOwnerMutation();
    const [createFolder] = useCreateDriveFolderMutation();
    const aiEnabled = data?.form_options.ai_task_creation_enabled ?? false;
    const running = (data?.projects ?? []).some((project) =>
        pipelineRunning(project, aiEnabled),
    );

    const setParam = (next: Record<string, string | null>) => {
        const copy = new URLSearchParams(params);

        for (const [key, value] of Object.entries(next)) {
            if (value === null || value === '') {
                copy.delete(key);
            } else {
                copy.set(key, value);
            }
        }

        if (!('page' in next)) {
            copy.delete('page');
        }

        setParams(copy, { replace: true });
    };

    // Debounced search → address
    useEffect(() => {
        if (searchDraft === search) {
            return;
        }

        const timer = window.setTimeout(
            () => setParam({ search: searchDraft.trim() || null }),
            400,
        );

        return () => window.clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchDraft]);

    // Refresh while a PRD is still being processed
    useEffect(() => {
        if (!running) {
            return;
        }

        const timer = window.setInterval(() => void refetch(), 4000);

        return () => window.clearInterval(timer);
    }, [running, refetch]);

    // A group's page is just its projects (and a search): no status chips or other filters.
    const inGroup = Boolean(query.group_id);
    const activeFilters = (
        inGroup
            ? [query.search]
            : [
                  query.status,
                  query.department_id,
                  query.assignment,
                  query.search,
              ]
    ).filter(Boolean).length;
    const options = data?.form_options;
    const activeGroup =
        query.group_id && query.group_id !== 'ungrouped'
            ? options?.groups.find(
                  (group) => String(group.id) === query.group_id,
              )
            : undefined;
    const pageTitle =
        query.group_id === 'ungrouped'
            ? 'Ungrouped projects'
            : (activeGroup?.name ?? 'Projects');

    const openOwnerModal = (project: AdminProjectRow) => {
        setOwning(project);
        setOwnerId(
            project.owner_developer_id
                ? String(project.owner_developer_id)
                : 'none',
        );
    };

    const columns: Column<AdminProjectRow>[] = [
        {
            key: 'project',
            header: 'Project',
            primary: true,
            className: 'w-[22rem] max-w-[22rem]',
            cell: (project) => {
                const mismatch =
                    project.milestones_count > 0 &&
                    project.milestones_weight_sum !== 100;

                return (
                    <div className="min-w-0 space-y-1.5">
                        <div className="flex items-start gap-2">
                            <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                                {project.project_code}
                            </span>
                            <p className="line-clamp-2 min-w-0 text-sm leading-snug font-bold break-words text-slate-900">
                                {project.name}
                            </p>
                            {mismatch ? (
                                <span
                                    title={`Milestones cover ${project.milestones_weight_sum}% — not 100%`}
                                    className="shrink-0 text-amber-500"
                                >
                                    <TriangleAlert className="size-4" />
                                </span>
                            ) : null}
                        </div>
                        <div className="flex flex-wrap gap-1">
                            <Badge tone={statusTone(project.status)}>
                                {project.status}
                            </Badge>
                            {project.current_phase ? (
                                <Badge tone="info">
                                    {phaseLabel}: {project.current_phase.name}
                                </Badge>
                            ) : null}
                            {project.type ? (
                                <Badge>{project.type}</Badge>
                            ) : null}
                        </div>
                        {pipelineRunning(project, aiEnabled) ? (
                            <p className="text-xs font-bold text-brand-600">
                                {pipelineLabel(project)}
                            </p>
                        ) : (
                            <div className="space-y-0.5">
                                <p className="text-[11px] font-medium text-slate-500">
                                    {project.project_completion_percentage}%
                                </p>
                                <ProgressBar
                                    value={
                                        project.project_completion_percentage
                                    }
                                    label={`${project.name} progress`}
                                />
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'tasks',
            header: 'Tasks status',
            cell: (project) => (
                <dl className="space-y-0.5 text-xs">
                    <div className="flex gap-1.5">
                        <dt className="text-slate-500">Total:</dt>
                        <dd className="font-semibold text-slate-900">
                            {project.tasks_count}
                        </dd>
                    </div>
                    <div className="flex gap-1.5">
                        <dt className="text-slate-500">Completed:</dt>
                        <dd className="font-semibold text-emerald-700">
                            {project.completed_tasks_count}
                        </dd>
                    </div>
                    <div className="flex gap-1.5">
                        <dt className="text-slate-500">Pending:</dt>
                        <dd className="font-semibold text-amber-700">
                            {project.tasks_count -
                                project.completed_tasks_count}
                        </dd>
                    </div>
                </dl>
            ),
        },
        {
            key: 'group',
            header: 'Group',
            cell: (project) =>
                project.group ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-slate-700">
                        <span
                            aria-hidden
                            className="size-2 rounded-full"
                            style={{ backgroundColor: project.group.color }}
                        />
                        {project.group.name}
                    </span>
                ) : (
                    <span className="text-slate-400">—</span>
                ),
        },
        {
            key: 'category',
            header: 'Category',
            cell: (project) =>
                project.category ? (
                    <span className="inline-flex rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-violet-700">
                        {project.category.name} (
                        {project.effective_weight ?? project.category.weight}%)
                    </span>
                ) : (
                    <span className="text-slate-400">—</span>
                ),
        },
        {
            key: 'deadline',
            header: 'Deadline',
            cell: (project) => (
                <span className="text-sm whitespace-nowrap text-slate-700">
                    {project.deadline ? formatDate(project.deadline) : '—'}
                </span>
            ),
        },
        {
            key: 'owner',
            header: 'Owner',
            cell: (project) => (
                <div className="flex items-center gap-2">
                    {project.owner ? (
                        <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900">
                                {project.owner.name}
                            </p>
                            <p className="text-xs text-slate-500">
                                {project.owner.developer_code}
                            </p>
                        </div>
                    ) : (
                        <span className="text-slate-400">—</span>
                    )}
                    {can('project-assignments.update') ? (
                        <button
                            type="button"
                            title={
                                isEditable(project)
                                    ? 'Assign owner'
                                    : 'Frozen — project is not In Progress'
                            }
                            disabled={!isEditable(project)}
                            aria-label={`Assign owner for ${project.name}`}
                            onClick={(event) => {
                                event.stopPropagation();
                                openOwnerModal(project);
                            }}
                            className="inline-flex size-5 shrink-0 items-center justify-center rounded-md bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-emerald-600"
                        >
                            <Plus className="size-3" />
                        </button>
                    ) : null}
                </div>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            hideOnMobile: false,
            cell: (project) => {
                const iconButton =
                    'inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white';
                const editable = isEditable(project);
                const lockedTitle = 'Frozen — project is not In Progress';

                return (
                    <div
                        className="flex items-center gap-2"
                        onClick={(event) => event.stopPropagation()}
                    >
                        {can('projects.update') ? (
                            <button
                                type="button"
                                title={editable ? 'Edit project' : lockedTitle}
                                disabled={!editable}
                                aria-label={`Edit ${project.name}`}
                                className={iconButton}
                                onClick={() => setEditing(project)}
                            >
                                <SquarePen className="size-4" />
                            </button>
                        ) : null}
                        {project.has_drive_folder &&
                        project.google_drive_url ? (
                            <a
                                href={project.google_drive_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Open Drive folder"
                                aria-label={`Drive folder of ${project.name}`}
                                className={iconButton}
                            >
                                <FolderOpen className="size-4" />
                            </a>
                        ) : can('projects.update') && data?.drive_connected ? (
                            <button
                                type="button"
                                title={
                                    editable
                                        ? 'Create Drive folder'
                                        : lockedTitle
                                }
                                disabled={!editable}
                                aria-label={`Create Drive folder for ${project.name}`}
                                className={iconButton}
                                onClick={() =>
                                    void run(createFolder({ id: project.id }))
                                }
                            >
                                <FolderOpen className="size-4" />
                            </button>
                        ) : null}
                        {can('projects.delete') ? (
                            <button
                                type="button"
                                title={
                                    editable ? 'Delete project' : lockedTitle
                                }
                                disabled={!editable}
                                aria-label={`Delete ${project.name}`}
                                className={cn(
                                    iconButton,
                                    'text-rose-700 hover:border-rose-300 hover:bg-rose-50',
                                )}
                                onClick={() => setDeleting(project)}
                            >
                                <Trash2 className="size-4" />
                            </button>
                        ) : null}
                    </div>
                );
            },
        },
    ];

    const searchBox = (
        <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <Input
                density="compact"
                placeholder="Name or code"
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                className="pl-9"
            />
        </div>
    );

    if (isError) {
        return (
            <ErrorState
                title="Could not load projects"
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

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="flex items-center gap-2.5 text-xl font-extrabold text-slate-900 sm:text-2xl">
                        {activeGroup ? (
                            <span
                                aria-hidden
                                className="size-3.5 shrink-0 rounded-full"
                                style={{ backgroundColor: activeGroup.color }}
                            />
                        ) : null}
                        {pageTitle}
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        {data
                            ? `${data.meta.total} project(s)`
                            : 'All projects'}
                    </p>
                </div>
                {can('projects.create') && options ? (
                    <Button onClick={() => setEditing('new')}>
                        <Plus className="size-4" /> New project
                    </Button>
                ) : null}
            </div>

            {!inGroup ? (
                <div
                    role="group"
                    aria-label="Status filter"
                    className="-mx-1 flex [scrollbar-width:none] gap-2 overflow-x-auto px-1 pb-1 [&::-webkit-scrollbar]:hidden"
                >
                    {[
                        ['', 'All'] as const,
                        ...STATUSES.map((status) => [status, status] as const),
                    ].map(([value, label]) => {
                        const active = (query.status ?? '') === value;
                        const count =
                            value === ''
                                ? Object.values(
                                      data?.status_counts ?? {},
                                  ).reduce((sum, item) => sum + item, 0)
                                : (data?.status_counts[value] ?? 0);

                        return (
                            <button
                                key={label}
                                type="button"
                                aria-pressed={active}
                                onClick={() =>
                                    setParam({ status: value || null })
                                }
                                className={cn(
                                    'flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-xs font-bold transition-colors',
                                    active
                                        ? 'border-brand bg-brand text-on-brand'
                                        : 'border-slate-200 bg-surface text-slate-700 hover:border-ember-300 hover:bg-brand-50',
                                )}
                            >
                                {label}{' '}
                                <span
                                    className={cn(
                                        'rounded-full px-1.5 text-[10px]',
                                        active
                                            ? 'bg-white/25'
                                            : 'bg-slate-100 text-slate-500',
                                    )}
                                >
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            ) : null}

            {inGroup ? (
                <div className="sm:max-w-sm">{searchBox}</div>
            ) : (
                <FilterBar
                    activeCount={activeFilters}
                    onReset={() => {
                        setSearchDraft('');
                        setParams(new URLSearchParams(), { replace: true });
                    }}
                >
                    {data?.can_change_department_filter ? (
                        <Field label="Department" className="lg:w-48">
                            <Select
                                density="compact"
                                value={query.department_id ?? 'all'}
                                onValueChange={(value) =>
                                    setParam({
                                        department_id:
                                            value === 'all' ? null : value,
                                    })
                                }
                                options={[
                                    {
                                        value: 'all',
                                        label: 'All departments',
                                    },
                                    ...(options?.departments ?? []).map(
                                        (department) => ({
                                            value: String(department.id),
                                            label: department.name,
                                        }),
                                    ),
                                ]}
                            />
                        </Field>
                    ) : null}
                    {options && options.groups.length > 0 ? (
                        <Field label="Group" className="lg:w-48">
                            <Select
                                density="compact"
                                value={query.group_id ?? 'all'}
                                onValueChange={(value) =>
                                    setParam({
                                        group_id:
                                            value === 'all' ? null : value,
                                    })
                                }
                                options={[
                                    { value: 'all', label: 'All groups' },
                                    ...options.groups.map((group) => ({
                                        value: String(group.id),
                                        label: group.name,
                                    })),
                                    {
                                        value: 'ungrouped',
                                        label: 'Ungrouped',
                                    },
                                ]}
                            />
                        </Field>
                    ) : null}
                    <Field label="Assignment" className="lg:w-44">
                        <Select
                            density="compact"
                            value={query.assignment ?? 'all'}
                            onValueChange={(value) =>
                                setParam({
                                    assignment: value === 'all' ? null : value,
                                })
                            }
                            options={[
                                { value: 'all', label: 'Any' },
                                { value: 'assigned', label: 'Assigned' },
                                {
                                    value: 'unassigned',
                                    label: 'Unassigned',
                                },
                            ]}
                        />
                    </Field>
                    <Field label="Search" className="lg:ml-auto lg:w-72">
                        {searchBox}
                    </Field>
                </FilterBar>
            )}

            <div
                className={cn(
                    'space-y-3 transition-opacity',
                    isFetching && !isLoading && 'opacity-70',
                )}
            >
                <DataTable
                    columns={columns}
                    rows={data?.projects}
                    rowKey={(project) => project.id}
                    loading={isLoading}
                    emptyTitle={
                        activeFilters > 0
                            ? 'No project matches these filters'
                            : 'No projects yet'
                    }
                    emptyDescription={
                        activeFilters > 0
                            ? undefined
                            : 'Create the first project to get started.'
                    }
                    onRowClick={(project) =>
                        navigate(`/admin/projects/${project.id}`, {
                            state: { groupId: project.project_group_id },
                        })
                    }
                />
                {data ? (
                    <Pagination
                        page={data.meta.current_page}
                        pageCount={data.meta.last_page}
                        total={data.meta.total}
                        onPageChange={(page) =>
                            setParam({ page: String(page) })
                        }
                    />
                ) : null}
            </div>

            {options ? (
                <ProjectFormDrawer
                    open={editing !== null}
                    project={editing === 'new' ? null : editing}
                    options={options}
                    defaultGroupId={activeGroup?.id}
                    onClose={() => setEditing(null)}
                />
            ) : null}

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                destructive
                title="Delete project?"
                description={
                    deleting
                        ? `"${deleting.name}" moves to Restore and can be recovered later.`
                        : ''
                }
                confirmLabel="Delete"
                loading={removing}
                onConfirm={async () => {
                    if (deleting && (await run(remove({ id: deleting.id })))) {
                        setDeleting(null);
                    }
                }}
            />

            <Modal
                open={owning !== null}
                onOpenChange={(open) => !open && setOwning(null)}
            >
                {owning ? (
                    <ModalContent
                        title="Change project owner"
                        description={owning.name}
                        footer={
                            <>
                                <ModalClose asChild>
                                    <Button variant="secondary">Cancel</Button>
                                </ModalClose>
                                <Button
                                    loading={savingOwner}
                                    onClick={async () => {
                                        try {
                                            const result = await saveOwner({
                                                id: owning.id,
                                                owner_developer_id:
                                                    ownerId === 'none'
                                                        ? null
                                                        : Number(ownerId),
                                            }).unwrap();
                                            toast.success(result.message);
                                            setOwning(null);
                                        } catch (error) {
                                            toast.error(errorMessage(error));
                                        }
                                    }}
                                >
                                    Save owner
                                </Button>
                            </>
                        }
                    >
                        <div className="pt-1">
                            <Field label="Owner">
                                <Select
                                    value={ownerId}
                                    onValueChange={setOwnerId}
                                    options={[
                                        { value: 'none', label: 'No owner' },
                                        ...(options?.developers ?? []).map(
                                            (developer) => ({
                                                value: String(developer.id),
                                                label: `${developer.name} (${developer.developer_code})${developer.is_active ? '' : ' · inactive'}`,
                                            }),
                                        ),
                                    ]}
                                />
                            </Field>
                        </div>
                    </ModalContent>
                ) : null}
            </Modal>
        </div>
    );
}

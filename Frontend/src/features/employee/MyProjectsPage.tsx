import { ListChecks, RefreshCw, Search, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';

import { errorMessage } from '@/api/baseApi';
import {
    useGetMyProjectsQuery,
    useUpdateProjectTeamMutation,
} from '@/api/endpoints/employee';
import type { MyProject, TeamDeveloper } from '@/api/employee-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Modal, ModalClose, ModalContent } from '@/components/ui/modal';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/date';
import { statusTone } from '@/lib/projectStatus';
import { cn } from '@/lib/utils';

const STATUSES = [
    'In Progress',
    'Cancelled',
    'Failed',
    'Successful',
    'Paused/Hold',
    'In Review',
    'Payment Pending',
];

export function MyProjectsPage() {
    const { data, isLoading, isError, refetch } = useGetMyProjectsQuery();
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [ongoingOnly, setOngoingOnly] = useState(false);
    const [assigning, setAssigning] = useState<MyProject | null>(null);
    const navigate = useNavigate();
    const projects = useMemo(() => {
        const term = search.trim().toLowerCase();

        return (data?.projects ?? []).filter(
            (project) =>
                (status === '' || project.status === status) &&
                (!ongoingOnly || project.ongoing_enabled) &&
                (term === '' ||
                    project.name.toLowerCase().includes(term) ||
                    project.project_code.toLowerCase().includes(term)),
        );
    }, [data?.projects, search, status, ongoingOnly]);
    const ongoingCount = (data?.projects ?? []).filter(
        (project) => project.ongoing_enabled,
    ).length;
    const counts = useMemo(() => {
        const result: Record<string, number> = {};

        for (const project of data?.projects ?? []) {
            result[project.status] = (result[project.status] ?? 0) + 1;
        }

        return result;
    }, [data?.projects]);

    if (isError) {
        return (
            <ErrorState
                title="Could not load your projects"
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
                    <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
                        Project task board
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Your projects with progress. Open one to check tasks on
                        or off.
                    </p>
                </div>
                <div className="relative sm:w-72">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                    <Input
                        aria-label="Search projects"
                        placeholder="Search name or code"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>

            <div
                role="group"
                aria-label="Status filter"
                className="-mx-1 flex [scrollbar-width:thin] flex-nowrap gap-2 overflow-x-auto px-1 pb-2"
            >
                {[
                    ['', 'All'] as const,
                    ...STATUSES.map((item) => [item, item] as const),
                ].map(([value, label]) => {
                    const active = status === value;
                    const count =
                        value === ''
                            ? (data?.projects.length ?? 0)
                            : (counts[value] ?? 0);

                    return (
                        <button
                            key={label}
                            type="button"
                            aria-pressed={active}
                            onClick={() => setStatus(value)}
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
                <span
                    aria-hidden="true"
                    className="mx-1 w-px shrink-0 self-stretch bg-slate-200"
                />
                <button
                    type="button"
                    aria-pressed={ongoingOnly}
                    onClick={() => setOngoingOnly((current) => !current)}
                    className={cn(
                        'flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-xs font-bold transition-colors',
                        ongoingOnly
                            ? 'border-brand bg-brand text-on-brand'
                            : 'border-slate-200 bg-surface text-slate-700 hover:border-ember-300 hover:bg-brand-50',
                    )}
                >
                    <RefreshCw className="size-3.5" /> Ongoing tasks on{' '}
                    <span
                        className={cn(
                            'rounded-full px-1.5 text-[10px]',
                            ongoingOnly
                                ? 'bg-white/25'
                                : 'bg-slate-100 text-slate-500',
                        )}
                    >
                        {ongoingCount}
                    </span>
                </button>
            </div>

            {isLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 3 }, (_, index) => (
                        <Skeleton key={index} className="h-56 rounded-2xl" />
                    ))}
                </div>
            ) : projects.length === 0 ? (
                <Card variant="flush">
                    <EmptyState
                        title={
                            search || status || ongoingOnly
                                ? 'No project matches these filters'
                                : 'No projects yet'
                        }
                        description={
                            search || status || ongoingOnly
                                ? undefined
                                : 'Ask an admin to assign you to a project. It will appear here.'
                        }
                    />
                </Card>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {projects.map((project, index) => (
                        <Card
                            key={project.id}
                            interactive
                            animate
                            delay={Math.min(index, 8) * 50}
                            role="link"
                            tabIndex={0}
                            aria-label={`${project.name}, open task manager`}
                            className="flex cursor-pointer flex-col gap-4 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none"
                            onClick={() =>
                                navigate(`/my-projects/${project.id}`)
                            }
                            onKeyDown={(event) => {
                                if (
                                    event.key === 'Enter' ||
                                    event.key === ' '
                                ) {
                                    event.preventDefault();
                                    navigate(`/my-projects/${project.id}`);
                                }
                            }}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-[11px] font-bold tracking-[0.15em] text-slate-400 uppercase">
                                        {project.project_code}
                                    </p>
                                    <h2 className="truncate text-base font-bold text-slate-900">
                                        {project.name}
                                    </h2>
                                    {project.client ? (
                                        <p className="truncate text-xs text-slate-500">
                                            {project.client.name}
                                        </p>
                                    ) : null}
                                </div>
                                <Badge tone={statusTone(project.status)}>
                                    {project.status}
                                </Badge>
                            </div>

                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between text-xs text-slate-600">
                                        <span>Project progress</span>
                                        <span className="font-bold text-slate-900">
                                            {
                                                project.project_completion_percentage
                                            }
                                            %
                                        </span>
                                    </div>
                                    <ProgressBar
                                        value={
                                            project.project_completion_percentage
                                        }
                                        label="Project progress"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between text-xs text-slate-600">
                                        <span>My completion</span>
                                        <span className="font-bold text-slate-900">
                                            {project.my_completion_percentage}%
                                        </span>
                                    </div>
                                    <ProgressBar
                                        value={project.my_completion_percentage}
                                        label="My completion"
                                    />
                                </div>
                            </div>

                            <div className="mt-auto flex items-end justify-between gap-3">
                                <div className="text-xs text-slate-500">
                                    <p>
                                        {project.pending_tasks_count} pending /{' '}
                                        {project.completed_tasks_count}{' '}
                                        completed
                                    </p>
                                    <p>
                                        Latest:{' '}
                                        {formatDateTime(
                                            project.latest_report_at,
                                        )}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    {project.is_project_owner ? (
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            aria-label={`Assign employees to ${project.name}`}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                setAssigning(project);
                                            }}
                                        >
                                            <UserPlus className="size-4" />
                                        </Button>
                                    ) : null}
                                    <Button
                                        asChild
                                        variant="outline"
                                        size="icon"
                                        aria-label={`Task manager for ${project.name}`}
                                    >
                                        <Link
                                            to={`/my-projects/${project.id}`}
                                            onClick={(event) =>
                                                event.stopPropagation()
                                            }
                                        >
                                            <ListChecks className="size-4" />
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            <AssignTeamDialog
                project={assigning}
                team={data?.team_developers ?? []}
                onClose={() => setAssigning(null)}
            />
        </div>
    );
}

function AssignTeamDialog({
    project,
    team,
    onClose,
}: {
    project: MyProject | null;
    team: TeamDeveloper[];
    onClose: () => void;
}) {
    return (
        <Modal
            open={project !== null}
            onOpenChange={(open) => !open && onClose()}
        >
            {project ? (
                <AssignTeamForm
                    key={project.id}
                    project={project}
                    team={team}
                    onClose={onClose}
                />
            ) : null}
        </Modal>
    );
}

function AssignTeamForm({
    project,
    team,
    onClose,
}: {
    project: MyProject;
    team: TeamDeveloper[];
    onClose: () => void;
}) {
    const [selected, setSelected] = useState<number[]>(
        project.assigned_developer_ids,
    );
    const [update, { isLoading }] = useUpdateProjectTeamMutation();

    const save = async () => {
        try {
            const result = await update({
                projectId: project.id,
                assigned_developer_ids: selected,
            }).unwrap();
            toast.success(result.message ?? 'Team updated.');
            onClose();
        } catch (error) {
            toast.error(errorMessage(error));
        }
    };

    return (
        <ModalContent
            title="Assign employees"
            description={`${project.name} (${project.project_code})`}
            footer={
                <>
                    <ModalClose asChild>
                        <Button variant="secondary">Cancel</Button>
                    </ModalClose>
                    <Button loading={isLoading} onClick={save}>
                        Save team
                    </Button>
                </>
            }
        >
            <ul className="space-y-1 pt-1">
                {team.map((developer) => (
                    <li key={developer.id}>
                        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm hover:bg-slate-50">
                            <Checkbox
                                checked={selected.includes(developer.id)}
                                onCheckedChange={(checked) =>
                                    setSelected((current) =>
                                        checked === true
                                            ? [...current, developer.id]
                                            : current.filter(
                                                  (id) => id !== developer.id,
                                              ),
                                    )
                                }
                            />
                            <span className="font-medium text-slate-900">
                                {developer.name}
                            </span>
                            <span className="text-xs text-slate-400">
                                {developer.developer_code}
                            </span>
                        </label>
                    </li>
                ))}
            </ul>
        </ModalContent>
    );
}

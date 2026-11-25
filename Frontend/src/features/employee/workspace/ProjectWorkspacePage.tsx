import {
    CalendarClock,
    Clock,
    Download,
    Lock,
    RefreshCw,
    Target,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router';
import { toast } from 'sonner';

import { useGetProjectDetailQuery } from '@/api/endpoints/employeeProject';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/empty-state';
import { ProgressBar } from '@/components/ui/progress-bar';
import { ProjectLinks } from '@/components/ui/project-links';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePermissions } from '@/hooks/usePermissions';
import { usePhaseLabel } from '@/hooks/usePhaseLabel';
import { formatDate } from '@/lib/date';
import { downloadFile } from '@/lib/download';
import { statusTone } from '@/lib/projectStatus';
import { cn } from '@/lib/utils';

import { DocumentsPanel } from './DocumentsPanel';
import { FeedbackPanel } from './FeedbackPanel';
import { MilestonesPanel } from './MilestonesPanel';
import { TeamDialog } from './ProjectDialogs';
import { ExtensionsPanel, RequestsPanel } from './RequestsPanel';
import { TasksPanel } from './TasksPanel';

/**
 * The employee's project workspace. One request loads everything for the selected
 * phase (`?phase=<id>|all`); each tab is its own component and the tab is kept in
 * the address (`?tab=`) so it can be linked.
 */
export function ProjectWorkspacePage() {
    const projectId = Number(useParams().projectId);
    const [params, setParams] = useSearchParams();
    const phaseParam = params.get('phase');
    const phase =
        phaseParam === null
            ? undefined
            : phaseParam === 'all'
              ? 'all'
              : Number(phaseParam);
    // One tab line: the three task views and the other sections. `tasks` is the old name of List.
    const rawTab = params.get('tab') ?? 'list';
    const tab = rawTab === 'tasks' ? 'list' : rawTab;
    const { data, isLoading, isError, refetch } = useGetProjectDetailQuery({
        projectId,
        phase,
    });
    const { can } = usePermissions();
    const { phaseLabel, phaseLabelPlural } = usePhaseLabel();
    const [teamOpen, setTeamOpen] = useState(false);

    const update = (next: Record<string, string | null>) => {
        const copy = new URLSearchParams(params);

        for (const [key, value] of Object.entries(next)) {
            if (value === null) {
                copy.delete(key);
            } else {
                copy.set(key, value);
            }
        }

        setParams(copy, { replace: true });
    };

    // The ongoing tasks used to be a tab here; old links go to their own page.
    if (rawTab === 'ongoing') {
        return <Navigate to={`/my-projects/${projectId}/ongoing`} replace />;
    }

    if (isError) {
        return (
            <ErrorState
                title="Could not load this project"
                description="It may not be assigned to you."
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

    if (isLoading || !data) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-28 rounded-2xl" />
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
                    {Array.from({ length: 5 }, (_, index) => (
                        <Skeleton key={index} className="h-24 rounded-2xl" />
                    ))}
                </div>
                <Skeleton className="h-64 rounded-2xl" />
            </div>
        );
    }

    const { project, stats } = data;
    const selected =
        data.phases.find((item) => item.id === data.selected_phase_id) ?? null;
    const locked = selected?.is_locked ?? false;
    // Team members see it while it is on (or while open work is left); permitted employees, always.
    const showOngoing =
        can('employee-projects.ongoing.toggle') ||
        (data.ongoing.is_member &&
            (data.ongoing.enabled || data.ongoing.has_open_work));
    const downloadPrd = async () => {
        try {
            await downloadFile(
                `/projects/${projectId}/prd-download${data.selected_phase_id ? `?phase=${data.selected_phase_id}` : ''}`,
                'project-prd',
            );
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : 'The download failed.',
            );
        }
    };

    return (
        <div className="space-y-5">
            <Card variant="accent" animate className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1.5">
                        <p className="text-[11px] font-bold tracking-[0.15em] text-slate-400 uppercase">
                            {project.project_code}
                        </p>
                        <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
                            {project.name}
                        </h1>
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={statusTone(project.status)}>
                                {project.status}
                            </Badge>
                            {project.type ? (
                                <Badge>{project.type}</Badge>
                            ) : null}
                            {locked ? (
                                <Badge tone="warning">
                                    <Lock className="size-3" /> {phaseLabel}{' '}
                                    completed
                                </Badge>
                            ) : null}
                        </div>
                        <p className="text-xs text-slate-500">
                            {project.client ? `${project.client.name} · ` : ''}
                            Deadline{' '}
                            {formatDate(selected?.deadline ?? project.deadline)}
                            {project.owner
                                ? ` · Owner ${project.owner.name}`
                                : ''}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {data.prd_available ? (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={downloadPrd}
                            >
                                <Download className="size-4" /> PRD
                            </Button>
                        ) : null}
                        {showOngoing ? (
                            <Button asChild variant="outline" size="sm">
                                <Link to={`/my-projects/${projectId}/ongoing`}>
                                    <RefreshCw className="size-4" /> Ongoing
                                    tasks
                                </Link>
                            </Button>
                        ) : null}
                        {project.is_project_owner &&
                        can('employee-projects.tasks.update') &&
                        !locked ? (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setTeamOpen(true)}
                            >
                                <Users className="size-4" /> Team
                            </Button>
                        ) : null}
                    </div>
                </div>

                {project.links && project.links.length > 0 ? (
                    <div className="space-y-1.5">
                        <p className="text-xs font-bold text-slate-500">
                            Links
                        </p>
                        <ProjectLinks links={project.links} />
                    </div>
                ) : null}

                {data.phases.length > 1 ? (
                    <div
                        role="group"
                        aria-label={phaseLabelPlural}
                        className="-mx-1 flex [scrollbar-width:none] gap-2 overflow-x-auto px-1 pb-1 [&::-webkit-scrollbar]:hidden"
                    >
                        {[
                            ...data.phases.map((item) => ({
                                key: String(item.id),
                                label: item.name,
                                locked: item.is_locked,
                            })),
                            {
                                key: 'all',
                                label: `All ${phaseLabelPlural.toLowerCase()}`,
                                locked: false,
                            },
                        ].map((item) => {
                            const active =
                                item.key === 'all'
                                    ? phaseParam === 'all'
                                    : String(data.selected_phase_id) ===
                                      item.key;

                            return (
                                <button
                                    key={item.key}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() => update({ phase: item.key })}
                                    className={cn(
                                        'flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-xs font-bold transition-colors',
                                        active
                                            ? 'border-brand bg-brand text-on-brand'
                                            : 'border-slate-200 bg-surface text-slate-700 hover:border-ember-300 hover:bg-brand-50',
                                    )}
                                >
                                    {item.locked ? (
                                        <Lock className="size-3" />
                                    ) : null}
                                    {item.label}
                                </button>
                            );
                        })}
                    </div>
                ) : null}

                <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>Project progress</span>
                        <span className="font-bold text-slate-900">
                            {stats.project_completion_percentage}%
                        </span>
                    </div>
                    <ProgressBar
                        value={stats.project_completion_percentage}
                        label="Project progress"
                    />
                </div>
            </Card>

            <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                <StatCard
                    label="My completion"
                    value={`${stats.my_completion_percentage}%`}
                    icon={Target}
                    highlight
                />
                <StatCard
                    label="Tasks done by me"
                    value={stats.my_completed_tasks_count}
                    delay={60}
                />
                <StatCard
                    label="Today (this project)"
                    value={`${stats.today_project_hours}h ${stats.today_project_minutes}m`}
                    icon={Clock}
                    delay={120}
                />
                <StatCard
                    label="Month hours"
                    value={`${stats.month_work_hours}h`}
                    hint={`${stats.remaining_month_hours}h to target`}
                    delay={180}
                />
                <StatCard
                    label="Reports"
                    value={stats.reports_count}
                    icon={CalendarClock}
                    delay={240}
                />
            </section>

            <Tabs
                value={tab}
                onValueChange={(value) =>
                    update({ tab: value === 'list' ? null : value })
                }
            >
                <TabsList>
                    <TabsTrigger value="list">List</TabsTrigger>
                    <TabsTrigger value="board">Board</TabsTrigger>
                    <TabsTrigger value="priority">Priority</TabsTrigger>
                    <TabsTrigger value="milestones">Milestones</TabsTrigger>
                    <TabsTrigger value="requests">
                        Requests ({project.requests.length})
                    </TabsTrigger>
                    <TabsTrigger value="extensions">
                        Deadline Extensions
                    </TabsTrigger>
                    <TabsTrigger value="feedback">
                        Client feedback ({project.issues.length})
                    </TabsTrigger>
                    {can('employee-projects.documents.view') ? (
                        <TabsTrigger value="documents">Documents</TabsTrigger>
                    ) : null}
                </TabsList>
                {(['list', 'board', 'priority'] as const).map((view) => (
                    <TabsContent key={view} value={view}>
                        <TasksPanel detail={data} locked={locked} view={view} />
                    </TabsContent>
                ))}
                <TabsContent value="milestones">
                    <MilestonesPanel detail={data} locked={locked} />
                </TabsContent>
                <TabsContent value="requests">
                    <RequestsPanel detail={data} locked={locked} />
                </TabsContent>
                <TabsContent value="extensions">
                    <ExtensionsPanel detail={data} locked={locked} />
                </TabsContent>
                <TabsContent value="feedback">
                    <FeedbackPanel detail={data} />
                </TabsContent>
                {can('employee-projects.documents.view') ? (
                    <TabsContent value="documents">
                        <DocumentsPanel detail={data} />
                    </TabsContent>
                ) : null}
            </Tabs>

            <TeamDialog
                detail={data}
                open={teamOpen}
                onOpenChange={setTeamOpen}
            />
        </div>
    );
}

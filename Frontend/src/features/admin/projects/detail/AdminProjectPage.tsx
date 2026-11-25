import { Download, Lock } from 'lucide-react';
import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { toast } from 'sonner';

import { useGetAdminProjectQuery } from '@/api/endpoints/adminProjectDetail';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/empty-state';
import { ProgressBar } from '@/components/ui/progress-bar';
import { ProjectLinks } from '@/components/ui/project-links';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePermissions } from '@/hooks/usePermissions';
import { usePhaseLabel } from '@/hooks/usePhaseLabel';
import { formatDate } from '@/lib/date';
import { downloadFile } from '@/lib/download';
import { statusTone } from '@/lib/projectStatus';
import { cn } from '@/lib/utils';

import { AdminDocumentsPanel } from './AdminDocumentsPanel';
import { AdminMilestonesPanel } from './AdminMilestonesPanel';
import { AdminTasksPanel } from './AdminTasksPanel';
import { CredentialsPanel } from './CredentialsPanel';
import { OngoingPanel } from './OngoingPanel';
import { OverviewPanel } from './OverviewPanel';
import { LinksDialog } from './LinksDialog';
import { PhasesPanel } from './PhasesPanel';
import {
    ExtensionsReviewPanel,
    FeedbackAdminPanel,
    RequestsReviewPanel,
} from './ReviewPanels';

/**
 * Admin project detail. One request loads the selected phase (`?phase=<id>|all`); each tab
 * is its own component and the tab lives in the address (`?tab=`).
 */
export function AdminProjectPage() {
    const projectId = Number(useParams().projectId);
    const [params, setParams] = useSearchParams();
    const [linksOpen, setLinksOpen] = useState(false);
    const phaseParam = params.get('phase');
    const phase =
        phaseParam === null
            ? undefined
            : phaseParam === 'all'
              ? 'all'
              : Number(phaseParam);
    const tab = params.get('tab') ?? 'overview';
    const { data, isLoading, isError, refetch } = useGetAdminProjectQuery({
        projectId,
        phase,
    });
    const { can } = usePermissions();
    const { phaseLabel, phaseLabelPlural } = usePhaseLabel();

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

    if (isError) {
        return (
            <ErrorState
                title="Could not load this project"
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
                <Skeleton className="h-36 rounded-2xl" />
                <Skeleton className="h-72 rounded-2xl" />
            </div>
        );
    }

    const { project } = data;
    const selected =
        data.phases.find((item) => item.id === data.selected_phase_id) ?? null;
    const locked = selected?.is_locked ?? false;
    // Links change like the rest of the project: only while it is In Progress.
    const canEditLinks =
        can('projects.update') && project.status === 'In Progress' && !locked;
    const showTab = (permission: string) => can(permission);
    const showOngoing = [
        'projects.ongoing.toggle',
        'projects.ongoing.weight.update',
        'projects.ongoing.assign',
    ].some(can);
    const downloadPrd = async () => {
        try {
            await downloadFile(
                `/manage/projects/${projectId}/prd-download${data.selected_phase_id ? `?phase_id=${data.selected_phase_id}` : ''}`,
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
                            {project.category ? (
                                <Badge tone="info">
                                    {project.category.name}
                                </Badge>
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
                            Deadline {formatDate(project.deadline)}
                            {project.owner
                                ? ` · Owner ${project.owner.name}`
                                : ''}
                        </p>
                    </div>
                    {data.prd?.status === 'ready' &&
                    can('projects.prd.download') ? (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={downloadPrd}
                        >
                            <Download className="size-4" /> PRD
                        </Button>
                    ) : null}
                </div>

                {project.links?.length || canEditLinks ? (
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-slate-500">
                                Links
                            </p>
                            {canEditLinks ? (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setLinksOpen(true)}
                                >
                                    {project.links?.length
                                        ? 'Edit links'
                                        : '+ Add links'}
                                </Button>
                            ) : null}
                        </div>
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
                        <span>
                            {selected
                                ? `${selected.name} progress`
                                : 'Project progress'}
                        </span>
                        <span className="font-bold text-slate-900">
                            {data.project_completion_percentage}%
                        </span>
                    </div>
                    <ProgressBar
                        value={data.project_completion_percentage}
                        label="Progress"
                    />
                </div>
            </Card>

            <LinksDialog
                projectId={project.id}
                links={project.links ?? []}
                open={linksOpen}
                onOpenChange={setLinksOpen}
            />

            <Tabs
                value={tab}
                onValueChange={(value) =>
                    update({ tab: value === 'overview' ? null : value })
                }
            >
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    {showTab('project-phases.view') ? (
                        <TabsTrigger value="phases">
                            {phaseLabelPlural} ({data.phases.length})
                        </TabsTrigger>
                    ) : null}
                    {showTab('project-tasks.view') ? (
                        <TabsTrigger value="tasks">
                            Tasks ({data.tasks.length})
                        </TabsTrigger>
                    ) : null}
                    {showTab('project-tasks.view') ? (
                        <TabsTrigger value="milestones">Milestones</TabsTrigger>
                    ) : null}
                    {showTab('project-requests.view') ? (
                        <TabsTrigger value="requests">
                            Requests ({data.project_requests.length})
                        </TabsTrigger>
                    ) : null}
                    {showTab('project-deadline-extensions.view') ? (
                        <TabsTrigger value="extensions">
                            Extensions ({data.deadline_extensions_count})
                        </TabsTrigger>
                    ) : null}
                    {showOngoing ? (
                        <TabsTrigger value="ongoing">Ongoing</TabsTrigger>
                    ) : null}
                    <TabsTrigger value="feedback">
                        Client feedback ({data.project_issues.length})
                    </TabsTrigger>
                    {showTab('project-credentials.view') ? (
                        <TabsTrigger value="credentials">
                            Credentials
                        </TabsTrigger>
                    ) : null}
                    {showTab('projects.documents.view') ? (
                        <TabsTrigger value="documents">Documents</TabsTrigger>
                    ) : null}
                </TabsList>
                <TabsContent value="overview">
                    <OverviewPanel detail={data} locked={locked} />
                </TabsContent>
                {showTab('project-phases.view') ? (
                    <TabsContent value="phases">
                        <PhasesPanel detail={data} />
                    </TabsContent>
                ) : null}
                {showTab('project-tasks.view') ? (
                    <TabsContent value="tasks">
                        <AdminTasksPanel detail={data} locked={locked} />
                    </TabsContent>
                ) : null}
                {showTab('project-tasks.view') ? (
                    <TabsContent value="milestones">
                        <AdminMilestonesPanel detail={data} locked={locked} />
                    </TabsContent>
                ) : null}
                {showTab('project-requests.view') ? (
                    <TabsContent value="requests">
                        <RequestsReviewPanel detail={data} />
                    </TabsContent>
                ) : null}
                {showTab('project-deadline-extensions.view') ? (
                    <TabsContent value="extensions">
                        <ExtensionsReviewPanel detail={data} locked={locked} />
                    </TabsContent>
                ) : null}
                {showOngoing ? (
                    <TabsContent value="ongoing">
                        <OngoingPanel projectId={projectId} />
                    </TabsContent>
                ) : null}
                <TabsContent value="feedback">
                    <FeedbackAdminPanel detail={data} />
                </TabsContent>
                {showTab('project-credentials.view') ? (
                    <TabsContent value="credentials">
                        <CredentialsPanel detail={data} />
                    </TabsContent>
                ) : null}
                {showTab('projects.documents.view') ? (
                    <TabsContent value="documents">
                        <AdminDocumentsPanel detail={data} />
                    </TabsContent>
                ) : null}
            </Tabs>
        </div>
    );
}

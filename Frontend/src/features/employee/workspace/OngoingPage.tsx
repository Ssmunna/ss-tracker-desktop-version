import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router';

import { useGetProjectDetailQuery } from '@/api/endpoints/employeeProject';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/usePermissions';

import { OngoingPanel } from './OngoingPanel';

/**
 * A project's ongoing tasks on their own page (opened from the project page). The project's
 * phases and versions are not involved: this is continuous work with its own monthly score.
 */
export function OngoingPage() {
    const projectId = Number(useParams().projectId);
    const { can } = usePermissions();
    const { data, isLoading, isError, refetch } = useGetProjectDetailQuery({
        projectId,
    });

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
                <Skeleton className="h-24 rounded-2xl" />
                <Skeleton className="h-64 rounded-2xl" />
            </div>
        );
    }

    const { project, ongoing } = data;
    const available =
        can('employee-projects.ongoing.toggle') ||
        (ongoing.is_member && (ongoing.enabled || ongoing.has_open_work));

    return (
        <div className="space-y-5">
            <Card variant="accent" animate className="space-y-2">
                <Button asChild variant="ghost" size="sm" className="-ml-2">
                    <Link to={`/my-projects/${projectId}`}>
                        <ArrowLeft className="size-4" /> Back to project
                    </Link>
                </Button>
                <p className="text-[11px] font-bold tracking-[0.15em] text-slate-400 uppercase">
                    {project.project_code}
                </p>
                <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
                    {project.name} · Ongoing tasks
                </h1>
            </Card>

            {available ? (
                <OngoingPanel projectId={projectId} />
            ) : (
                <Card variant="flush">
                    <EmptyState
                        title="Ongoing tasks are not available to you here"
                        description="They are switched off, or you are not on this project's ongoing team."
                    />
                </Card>
            )}
        </div>
    );
}

import { FolderKanban, MessageSquare } from 'lucide-react';
import { Link, useNavigate } from 'react-router';

import { useGetClientProjectsQuery } from '@/api/endpoints/account';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDate } from '@/lib/date';
import { statusTone } from '@/lib/projectStatus';
import { usePhaseLabel } from '@/hooks/usePhaseLabel';

/** The client's own projects: status, progress and deadline. Serves `/client` and `/client/projects`. */
export function ClientProjectsPage() {
    const { t, phaseLabel } = usePhaseLabel();
    const { can } = usePermissions();
    const navigate = useNavigate();
    const { data, isLoading, isError, refetch } = useGetClientProjectsQuery();

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
                        Your projects
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Progress and deadlines, updated by the team.
                    </p>
                </div>
                {can('chat.access') ? (
                    <Button asChild variant="outline">
                        <Link to="/chat">
                            <MessageSquare className="size-4" /> Open chat
                        </Link>
                    </Button>
                ) : null}
            </div>
            {isLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 3 }, (_, index) => (
                        <Skeleton key={index} className="h-40 w-full" />
                    ))}
                </div>
            ) : data && data.projects.length === 0 ? (
                <Card variant="flush">
                    <EmptyState
                        icon={FolderKanban}
                        title="No projects yet"
                        description="Your projects appear here once the team adds them."
                    />
                </Card>
            ) : (
                <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {data?.projects.map((project, index) => (
                        <li key={project.id}>
                            <Card
                                interactive
                                animate
                                delay={index * 60}
                                className="h-full cursor-pointer space-y-3"
                                role="link"
                                tabIndex={0}
                                aria-label={`Open ${project.name}`}
                                onClick={() =>
                                    navigate(`/client/projects/${project.id}`)
                                }
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                        navigate(
                                            `/client/projects/${project.id}`,
                                        );
                                    }
                                }}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="truncate font-bold text-slate-900">
                                            {project.name}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {project.project_code}
                                        </p>
                                    </div>
                                    {project.status ? (
                                        <Badge
                                            tone={statusTone(project.status)}
                                        >
                                            {project.status}
                                        </Badge>
                                    ) : null}
                                </div>
                                <div className="space-y-1">
                                    <ProgressBar
                                        value={project.completion_percentage}
                                        label={`${project.name} progress`}
                                    />
                                    <p className="text-xs text-slate-500">
                                        {t(
                                            `${project.completion_percentage}% of the current phase`,
                                        )}
                                        {project.current_phase
                                            ? ` · ${phaseLabel.toLowerCase()} ${project.current_phase.seq} of ${project.current_phase.total}`
                                            : ''}
                                    </p>
                                </div>
                                <p className="text-xs text-slate-600">
                                    {project.completed_at
                                        ? `Completed ${formatDate(project.completed_at)}`
                                        : `Deadline ${formatDate(project.deadline)}`}
                                </p>
                            </Card>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

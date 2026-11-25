import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router';

import { useGetReportQuery } from '@/api/endpoints/reports';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, formatDateTime } from '@/lib/date';

export function ReportDetailPage() {
    const id = Number(useParams().reportId);
    const { data, isLoading, isError, refetch } = useGetReportQuery(id);

    if (isError) {
        return (
            <ErrorState
                title="Could not load this report"
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
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-40 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="space-y-2">
                <Button asChild variant="ghost" size="sm">
                    <Link to="/admin/reports">
                        <ArrowLeft className="size-4" /> Reports
                    </Link>
                </Button>
                <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
                    {data.developer.name}
                </h1>
                <p className="text-sm text-slate-500">
                    {data.developer.developer_code} ·{' '}
                    {formatDate(data.report_date)} ·{' '}
                    {data.total_completed_hours}h completed · submitted{' '}
                    {formatDateTime(data.created_at)}
                </p>
            </div>

            {data.projects.length === 0 ? (
                <Card variant="flush">
                    <EmptyState title="No tasks in this report" />
                </Card>
            ) : (
                data.projects.map((project) => (
                    <Card
                        key={`${project.id}-${project.project_code}`}
                        className="space-y-4"
                    >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className="font-bold text-slate-900">
                                    {project.name}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {project.project_code}
                                    {project.department
                                        ? ` · ${project.department}`
                                        : ''}
                                </p>
                            </div>
                            <p className="text-xs text-slate-500">
                                {project.completed_hours}h of{' '}
                                {project.estimated_hours}h estimated
                            </p>
                        </div>
                        <div className="space-y-1">
                            <ProgressBar
                                value={project.completion_percentage}
                                label={`${project.name} progress`}
                            />
                            <p className="text-xs text-slate-500">
                                {project.completed_tasks_count}/
                                {project.total_tasks_count} tasks ·{' '}
                                {project.completion_percentage}%
                            </p>
                        </div>
                        <ul className="divide-y divide-slate-100">
                            {project.tasks.map((task) => (
                                <li
                                    key={task.id}
                                    className="flex items-start justify-between gap-3 py-2.5"
                                >
                                    <div className="min-w-0">
                                        <p className="text-sm text-slate-900">
                                            {task.description}
                                        </p>
                                        {task.task_code ? (
                                            <p className="text-xs text-slate-500">
                                                {task.task_code}
                                            </p>
                                        ) : null}
                                    </div>
                                    <p className="shrink-0 text-xs font-bold text-slate-700">
                                        {task.completed_hours ?? '-'}h
                                        {task.estimated_hours !== null ? (
                                            <span className="font-normal text-slate-500">
                                                {' '}
                                                / {task.estimated_hours}h
                                            </span>
                                        ) : null}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    </Card>
                ))
            )}
        </div>
    );
}

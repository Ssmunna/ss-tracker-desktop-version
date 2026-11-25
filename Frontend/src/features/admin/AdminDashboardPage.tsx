import {
    CheckCircle2,
    CircleDollarSign,
    FolderKanban,
    Hourglass,
    Loader,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

import {
    useGetAdminDashboardQuery,
    useGetChartDataQuery,
} from '@/api/endpoints/admin';
import { BarChart, LineChart } from '@/components/charts/charts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDate, formatDateTime } from '@/lib/date';

const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
];

export function AdminDashboardPage() {
    const { can } = usePermissions();
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const { data, isLoading, isError, refetch } = useGetAdminDashboardQuery();
    const isCurrent =
        month === now.getMonth() + 1 && year === now.getFullYear();
    const chartsAllowed = can('dashboard.chart-data.view');
    const { data: chosen, isFetching: loadingCharts } = useGetChartDataQuery(
        { year, month },
        { skip: isCurrent || !chartsAllowed },
    );

    if (isError) {
        return (
            <ErrorState
                title="Could not load the dashboard"
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

    // The same endpoint answers an employee account with their own payload.
    if (data && data.type !== 'admin') {
        return (
            <Card variant="flush">
                <EmptyState
                    title="This is the admin dashboard"
                    description="Your account opens a different dashboard."
                    action={
                        <Button asChild size="sm" variant="outline">
                            <Link to="/">Go to my dashboard</Link>
                        </Button>
                    }
                />
            </Card>
        );
    }

    const charts = isCurrent ? data?.chartData : (chosen ?? data?.chartData);
    const stats = data?.stats;
    const years = Array.from(
        { length: 4 },
        (_, index) => now.getFullYear() - index,
    );

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
                    Dashboard
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                    Reports, projects and today&apos;s progress.
                </p>
            </div>

            {data?.staleTaskDigest ? (
                <Card className="space-y-2 border-amber-200 bg-amber-50">
                    <p className="text-xs font-bold tracking-wide text-amber-700 uppercase">
                        No task update · {data.staleTaskDigest.date}
                    </p>
                    {data.staleTaskDigest.rows.length === 0 ? (
                        <p className="text-sm text-slate-700">
                            Everyone with open tasks updated today.
                        </p>
                    ) : (
                        <ul className="divide-y divide-amber-100 text-sm">
                            {data.staleTaskDigest.rows.map((row) => (
                                <li
                                    key={row.name}
                                    className="flex flex-wrap items-center justify-between gap-2 py-2"
                                >
                                    <span className="font-bold text-slate-900">
                                        {row.name}
                                    </span>
                                    <span className="text-slate-600">
                                        {row.open_tasks} open task(s) ·{' '}
                                        {row.projects.join(', ')}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            ) : null}

            <section className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {isLoading || !stats ? (
                    Array.from({ length: 5 }, (_, index) => (
                        <Skeleton key={index} className="h-24 rounded-2xl" />
                    ))
                ) : (
                    <>
                        <StatCard
                            label="Total projects"
                            value={stats.total_projects}
                            icon={FolderKanban}
                            hint={`${stats.total_developers} employees`}
                            highlight
                        />
                        <StatCard
                            label="In progress"
                            value={stats.in_progress_projects}
                            icon={Loader}
                            hint={`${stats.month_reports} reports this month`}
                            delay={60}
                        />
                        <StatCard
                            label="Successful"
                            value={stats.successful_projects}
                            icon={CheckCircle2}
                            hint="Completed and delivered"
                            delay={120}
                        />
                        <StatCard
                            label="Payment pending"
                            value={stats.payment_pending_projects}
                            icon={CircleDollarSign}
                            hint={`${stats.today_reports} reports today`}
                            delay={180}
                        />
                        <StatCard
                            label="Cancelled"
                            value={stats.cancelled_projects}
                            icon={XCircle}
                            hint="Not proceeding"
                            delay={240}
                        />
                        <StatCard
                            label="Total reports"
                            value={stats.total_reports}
                            icon={Hourglass}
                            delay={300}
                        />
                    </>
                )}
            </section>

            <div className="grid gap-4 lg:grid-cols-2">
                <Card className="space-y-3">
                    <div>
                        <CardTitle className="text-base">
                            Today&apos;s completed tasks by project
                        </CardTitle>
                        <CardDescription>
                            Completion events recorded today
                        </CardDescription>
                    </div>
                    {isLoading ? (
                        <Skeleton className="h-64" />
                    ) : (data?.chartData.today_by_project.labels.length ??
                          0) === 0 ? (
                        <EmptyState title="No work completed yet today" />
                    ) : (
                        <BarChart
                            labels={data!.chartData.today_by_project.labels}
                            series={[
                                {
                                    label: 'Completions',
                                    data: data!.chartData.today_by_project
                                        .reports,
                                },
                                {
                                    label: 'Tasks',
                                    data: data!.chartData.today_by_project
                                        .tasks,
                                },
                            ]}
                        />
                    )}
                </Card>
                <Card className="space-y-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <CardTitle className="text-base">
                                Monthly report activity
                            </CardTitle>
                            <CardDescription>
                                {months[month - 1]} {year}
                                {loadingCharts ? ' · loading…' : ''}
                            </CardDescription>
                        </div>
                        {chartsAllowed ? (
                            <div className="flex gap-2">
                                <Select
                                    density="compact"
                                    className="w-24"
                                    aria-label="Month"
                                    value={String(month)}
                                    onValueChange={(value) =>
                                        setMonth(Number(value))
                                    }
                                    options={months.map((label, index) => ({
                                        value: String(index + 1),
                                        label,
                                    }))}
                                />
                                <Select
                                    density="compact"
                                    className="w-24"
                                    aria-label="Year"
                                    value={String(year)}
                                    onValueChange={(value) =>
                                        setYear(Number(value))
                                    }
                                    options={years.map((value) => ({
                                        value: String(value),
                                        label: String(value),
                                    }))}
                                />
                            </div>
                        ) : null}
                    </div>
                    {isLoading || !charts ? (
                        <Skeleton className="h-64" />
                    ) : (
                        <LineChart
                            labels={charts.monthly_activity.labels}
                            series={[
                                {
                                    label: 'Reports',
                                    data: charts.monthly_activity.reports,
                                },
                            ]}
                        />
                    )}
                </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <Card className="space-y-3">
                    <CardTitle className="text-base">Recent updates</CardTitle>
                    {isLoading ? (
                        <Skeleton className="h-40" />
                    ) : (data?.recentUpdates.length ?? 0) === 0 ? (
                        <EmptyState title="No reports yet" />
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {data!.recentUpdates.map((update) => (
                                <li
                                    key={update.id}
                                    className="flex items-start justify-between gap-3 py-2.5"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-bold text-slate-900">
                                            {update.developer.name}
                                        </p>
                                        <p className="truncate text-xs text-slate-500">
                                            {update.project.project_code}
                                            {update.project.name
                                                ? ` · ${update.project.name}`
                                                : ''}
                                        </p>
                                    </div>
                                    <div className="shrink-0 text-right text-xs text-slate-500">
                                        <p>{update.tasks_count} tasks</p>
                                        <p>{formatDate(update.report_date)}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
                <Card className="space-y-3">
                    <CardTitle className="text-base">
                        Today&apos;s project work
                    </CardTitle>
                    {isLoading ? (
                        <Skeleton className="h-40" />
                    ) : (data?.todayProjectWork.length ?? 0) === 0 ? (
                        <EmptyState title="No project work today" />
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {data!.todayProjectWork.map((work) => (
                                <li
                                    key={work.project_id}
                                    className="space-y-1 py-2.5"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="truncate text-sm font-bold text-slate-900">
                                            {work.project_name}
                                        </p>
                                        <Badge tone="brand">
                                            {work.tasks_count} tasks
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        {work.project_code} ·{' '}
                                        {work.developers.join(', ') ||
                                            'No developer'}{' '}
                                        · latest{' '}
                                        {formatDateTime(work.latest_report_at)}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>

            <Card className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-base">Recent sign-ins</CardTitle>
                    <CardDescription>
                        {data?.recentLogins.length ?? 0} entries
                    </CardDescription>
                </div>
                {isLoading ? (
                    <Skeleton className="h-32" />
                ) : (data?.recentLogins.length ?? 0) === 0 ? (
                    <EmptyState title="No sign-ins recorded" />
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {data!.recentLogins.map((login, index) => (
                            <li
                                key={`${login.id}-${index}`}
                                className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-bold text-slate-900">
                                        {login.name ?? 'Unknown'}{' '}
                                        <Badge className="ml-1 capitalize">
                                            {login.role ?? 'user'}
                                        </Badge>
                                    </p>
                                    <p className="truncate text-xs text-slate-500">
                                        {login.email} ·{' '}
                                        {login.ip_address ?? 'no IP'}
                                    </p>
                                </div>
                                <p className="text-xs text-slate-500">
                                    {formatDateTime(login.last_activity_at)}
                                </p>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
        </div>
    );
}

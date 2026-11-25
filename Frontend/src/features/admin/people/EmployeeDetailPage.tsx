import { ArrowLeft, KeyRound, Pencil } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router';

import { useGetEmployeeQuery } from '@/api/endpoints/people';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { ErrorState } from '@/components/ui/empty-state';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ActiveBadge } from '@/features/admin/org/shared';
import { MONTHS, monthLabel } from '@/features/admin/kpi/months';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDate } from '@/lib/date';
import type { EmployeeDetail } from '@/api/people-types';

type Project = EmployeeDetail['projectBreakdown'][number];

export function EmployeeDetailPage() {
    const { can } = usePermissions();
    const id = Number(useParams().employeeId);
    const [params, setParams] = useSearchParams();
    const month = params.get('month') ? Number(params.get('month')) : undefined;
    const year = params.get('year') ? Number(params.get('year')) : undefined;
    const { data, isLoading, isError, refetch } = useGetEmployeeQuery({
        id,
        month,
        year,
    });

    if (isError) {
        return (
            <ErrorState
                title="Could not load this employee"
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
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {Array.from({ length: 4 }, (_, index) => (
                        <Skeleton key={index} className="h-24 w-full" />
                    ))}
                </div>
                <Skeleton className="h-48 w-full" />
            </div>
        );
    }

    const person = data.developer;
    const set = (key: string, value: string) => {
        const copy = new URLSearchParams(params);
        copy.set(key, value);
        setParams(copy, { replace: true });
    };

    const columns: Column<Project>[] = [
        {
            key: 'project',
            header: 'Project',
            primary: true,
            cell: (project) => (
                <div className="min-w-0">
                    <Link
                        to={`/admin/projects/${project.project_id}`}
                        className="truncate font-bold text-slate-900 hover:underline"
                    >
                        {project.project_name}
                    </Link>
                    <p className="truncate text-xs font-normal text-slate-500">
                        {project.project_code} · {project.status} · due{' '}
                        {formatDate(project.deadline)}
                    </p>
                </div>
            ),
        },
        {
            key: 'progress',
            header: 'Project progress',
            cell: (project) => (
                <div className="min-w-28 space-y-1">
                    <ProgressBar
                        value={project.completion_percentage}
                        label={`${project.project_name} progress`}
                    />
                    <p className="text-[11px] font-normal text-slate-500">
                        {project.overall_completed_count}/{project.total_tasks}{' '}
                        tasks
                    </p>
                </div>
            ),
        },
        {
            key: 'mine',
            header: 'Their tasks',
            cell: (project) => (
                <span className="text-xs">
                    {project.developer_completed_count}/
                    {project.developer_assigned_count} done
                </span>
            ),
        },
        {
            key: 'hours',
            header: 'Hours',
            hideOnMobile: true,
            cell: (project) => (
                <span className="text-xs">{project.hours}h</span>
            ),
        },
    ];

    return (
        <div className="space-y-5">
            <div className="space-y-2">
                <Button asChild variant="ghost" size="sm">
                    <Link to="/admin/employees">
                        <ArrowLeft className="size-4" /> Employees
                    </Link>
                </Button>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
                            {person.name}
                        </h1>
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                            {person.developer_code} · {person.email} ·{' '}
                            {person.department ?? 'No department'}
                            <ActiveBadge
                                status={
                                    person.is_active ? 'active' : 'inactive'
                                }
                            />
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {can('employees.update') ? (
                            <Button asChild variant="outline">
                                <Link to={`/admin/employees/${id}/edit`}>
                                    <Pencil className="size-4" /> Edit
                                </Link>
                            </Button>
                        ) : null}
                        {can('employees.special-permissions.update') ? (
                            <Button asChild variant="outline">
                                <Link to={`/admin/employees/${id}/permissions`}>
                                    <KeyRound className="size-4" /> Special
                                    permissions
                                </Link>
                            </Button>
                        ) : null}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard
                    label="Hours today"
                    value={`${data.hours.today}h`}
                    hint={`${data.hours.month}h this month`}
                />
                <StatCard
                    label="Total hours"
                    value={`${data.hours.total}h`}
                    hint={`${data.reports_count} report(s)`}
                />
                <StatCard
                    label="Tasks done"
                    value={person.completed_tasks_count}
                    hint={`${person.deadline_extensions_requested_count} extension request(s)`}
                />
                <StatCard
                    highlight
                    label={`KPI, ${monthLabel(data.monthlyKpi.month, data.monthlyKpi.year)}`}
                    value={`${data.monthlyKpi.total_kpi_achievement}%`}
                    hint={`Personal ${data.monthlyKpi.personal_achievement_percentage}%`}
                />
            </div>

            <Card className="space-y-3">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <h2 className="text-sm font-bold text-slate-900">
                        KPI by month
                    </h2>
                    <div className="flex gap-2">
                        <Field label="Month" className="w-36">
                            <Select
                                density="compact"
                                value={String(data.monthlyKpi.month)}
                                onValueChange={(value) => set('month', value)}
                                options={MONTHS.map((name, index) => ({
                                    value: String(index + 1),
                                    label: name,
                                }))}
                            />
                        </Field>
                        <Field label="Year" className="w-24">
                            <Input
                                density="compact"
                                type="number"
                                value={data.monthlyKpi.year}
                                onChange={(event) => {
                                    const value = Number(event.target.value);

                                    if (value >= 2000 && value <= 2100) {
                                        set('year', String(value));
                                    }
                                }}
                            />
                        </Field>
                    </div>
                </div>
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                    {data.kpi_history.map((item) => (
                        <li
                            key={`${item.year}-${item.month}`}
                            className="rounded-xl bg-slate-50 p-3"
                        >
                            <p className="text-xs text-slate-500">
                                {monthLabel(item.month, item.year)}
                            </p>
                            <p className="text-lg font-bold text-slate-900">
                                {item.total_kpi}%
                            </p>
                        </li>
                    ))}
                </ul>
            </Card>

            <div className="space-y-2">
                <h2 className="text-sm font-bold text-slate-900">Projects</h2>
                <DataTable
                    columns={columns}
                    rows={data.projectBreakdown}
                    rowKey={(project) => project.project_id}
                    emptyTitle="Not on any project"
                />
            </div>
        </div>
    );
}

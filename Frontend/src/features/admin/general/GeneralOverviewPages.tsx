import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';

import {
    useGetGeneralEmployeeQuery,
    useGetGeneralOverviewQuery,
} from '@/api/endpoints/generalTasks';
import type { AdminGeneralTask, GeneralSummaryRow } from '@/api/general-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/ui/data-table';
import { ErrorState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { FilterBar } from '@/components/ui/filter-bar';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { PageHeader } from '@/features/admin/org/shared';
import { formatDate } from '@/lib/date';
import { formatMinutes } from '@/lib/time';

import { currentMonth } from './month';
import { GeneralTabs, MonthField } from './shared';

export function GeneralOverviewPage() {
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const month = params.get('month') ?? currentMonth();
    const search = params.get('search') ?? '';
    const { data, isLoading, isError, refetch } = useGetGeneralOverviewQuery({
        month,
        search: search || undefined,
    });

    const set = (key: string, value: string | null) => {
        const copy = new URLSearchParams(params);

        if (value) {
            copy.set(key, value);
        } else {
            copy.delete(key);
        }

        setParams(copy, { replace: true });
    };

    const columns: Column<GeneralSummaryRow>[] = [
        {
            key: 'name',
            header: 'Employee',
            primary: true,
            cell: (row) => (
                <div className="min-w-0">
                    <p className="truncate font-bold text-slate-900">
                        {row.developer_name}
                    </p>
                    <p className="truncate text-xs font-normal text-slate-500">
                        {row.developer_code}
                    </p>
                </div>
            ),
        },
        {
            key: 'counts',
            header: 'Done / assigned',
            cell: (row) => (
                <span className="text-xs">
                    {row.completed}/{row.assigned}
                </span>
            ),
        },
        {
            key: 'missed',
            header: 'Missed · late',
            cell: (row) => (
                <span className="text-xs">
                    {row.missed} · {row.late}
                </span>
            ),
        },
        {
            key: 'kpi',
            header: 'KPI',
            cell: (row) =>
                row.is_closed ? (
                    <Badge tone="success">
                        {row.awarded_kpi_percentage ?? 0}%
                    </Badge>
                ) : (
                    <Badge>Month open</Badge>
                ),
        },
    ];

    if (isError) {
        return (
            <ErrorState
                title="Could not load the overview"
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
            <PageHeader
                title="General tasks"
                description="Per-employee summary for the month."
            />
            <GeneralTabs />
            <FilterBar
                activeCount={Number(Boolean(search))}
                onReset={() => set('search', null)}
            >
                <MonthField
                    value={month}
                    onChange={(value) => set('month', value)}
                />
                <Field label="Search" className="lg:w-64">
                    <Input
                        density="compact"
                        placeholder="Name or code"
                        value={search}
                        onChange={(event) =>
                            set('search', event.target.value || null)
                        }
                    />
                </Field>
            </FilterBar>
            <DataTable
                columns={columns}
                rows={data?.rows}
                rowKey={(row) => row.developer_id}
                loading={isLoading}
                emptyTitle="No general tasks in this month"
                onRowClick={(row) =>
                    navigate(
                        `/admin/general-tasks/employees/${row.developer_id}?month=${month}`,
                    )
                }
            />
        </div>
    );
}

export function GeneralEmployeePage() {
    const id = Number(useParams().employeeId);
    const [params, setParams] = useSearchParams();
    const month = params.get('month') ?? currentMonth();
    const { data, isLoading, isError, refetch } = useGetGeneralEmployeeQuery({
        id,
        month,
    });

    if (isError) {
        return (
            <ErrorState
                title="Could not load this employee's tasks"
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
                <Skeleton className="h-48 w-full" />
            </div>
        );
    }

    const columns: Column<AdminGeneralTask>[] = [
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
                        {task.assigned_by
                            ? `Assigned by ${task.assigned_by}`
                            : ''}
                    </p>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            cell: (task) => (
                <Badge
                    tone={
                        task.status === 'completed'
                            ? 'success'
                            : task.is_overdue
                              ? 'danger'
                              : 'warning'
                    }
                >
                    {task.status === 'completed'
                        ? 'Completed'
                        : task.is_overdue
                          ? 'Overdue'
                          : 'Pending'}
                </Badge>
            ),
        },
        {
            key: 'deadline',
            header: 'Deadline',
            cell: (task) => (
                <span className="text-xs">{formatDate(task.deadline)}</span>
            ),
        },
        {
            key: 'time',
            header: 'Time spent',
            hideOnMobile: true,
            cell: (task) => (
                <span className="text-xs">
                    {task.spent_minutes
                        ? formatMinutes(task.spent_minutes)
                        : '-'}
                </span>
            ),
        },
    ];

    const summary = data.summary;

    return (
        <div className="space-y-5">
            <div className="space-y-2">
                <Button asChild variant="ghost" size="sm">
                    <Link to={`/admin/general-tasks/overview?month=${month}`}>
                        <ArrowLeft className="size-4" /> Overview
                    </Link>
                </Button>
                <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
                    {data.employee.name}
                </h1>
                <p className="text-sm text-slate-500">
                    {data.employee.developer_code}
                </p>
            </div>
            <div className="max-w-xs">
                <MonthField
                    value={month}
                    onChange={(value) => {
                        const copy = new URLSearchParams(params);
                        copy.set('month', value);
                        setParams(copy, { replace: true });
                    }}
                />
            </div>
            {summary ? (
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <StatCard label="Assigned" value={summary.assigned} />
                    <StatCard label="Completed" value={summary.completed} />
                    <StatCard
                        label="Missed"
                        value={summary.missed}
                        hint={`${summary.late} late`}
                    />
                    <StatCard
                        highlight
                        label="KPI"
                        value={
                            summary.is_closed
                                ? `${summary.awarded_kpi_percentage ?? 0}%`
                                : 'Open'
                        }
                        hint={`Weight ${data.monthly_weight}%`}
                    />
                </div>
            ) : null}
            <DataTable
                columns={columns}
                rows={data.tasks}
                rowKey={(task) => task.id}
                emptyTitle="No tasks this month"
            />
        </div>
    );
}

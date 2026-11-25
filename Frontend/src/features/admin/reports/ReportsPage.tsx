import { Download, Eye, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';

import type { ReportRow } from '@/api/report-types';
import { useGetReportsQuery } from '@/api/endpoints/reports';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { FilterBar } from '@/components/ui/filter-bar';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePermissions } from '@/hooks/usePermissions';
import { downloadFile } from '@/lib/download';
import { formatDate } from '@/lib/date';
import { cn } from '@/lib/utils';

const KEYS = [
    'developer_code',
    'project_code',
    'department_id',
    'from_date',
    'to_date',
] as const;

export function ReportsPage() {
    const { can } = usePermissions();
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const [exporting, setExporting] = useState(false);
    const [missingSearch, setMissingSearch] = useState('');
    const tab = params.get('tab') === 'missing' ? 'missing' : 'reports';
    const filters: Record<string, string> = {};

    for (const key of KEYS) {
        const value = params.get(key);

        if (value) {
            filters[key] = value;
        }
    }

    const page = Number(params.get('page') ?? 1);
    const { data, isLoading, isFetching, isError, refetch } =
        useGetReportsQuery({
            ...filters,
            per_page: 20,
            page,
        });
    const activeFilters = Object.keys(filters).length;
    const todayOnly = !filters.from_date && !filters.to_date;

    const missing = useMemo(() => {
        const term = missingSearch.trim().toLowerCase();

        return (data?.missing_today ?? []).filter(
            (person) =>
                term === '' ||
                `${person.name} ${person.developer_code}`
                    .toLowerCase()
                    .includes(term),
        );
    }, [data?.missing_today, missingSearch]);

    const set = (key: string, value: string | null) => {
        const copy = new URLSearchParams(params);

        if (value) {
            copy.set(key, value);
        } else {
            copy.delete(key);
        }

        if (key !== 'page') {
            copy.delete('page');
        }

        setParams(copy, { replace: true });
    };

    const exportFile = async () => {
        setExporting(true);

        try {
            const query = new URLSearchParams(filters).toString();
            await downloadFile(
                `/manage/export${query ? `?${query}` : ''}`,
                'reports.xlsx',
            );
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : 'The export failed.',
            );
        } finally {
            setExporting(false);
        }
    };

    const columns: Column<ReportRow>[] = [
        {
            key: 'developer',
            header: 'Employee',
            primary: true,
            cell: (report) => (
                <div className="min-w-0">
                    <p className="truncate font-bold text-slate-900">
                        {report.developer.name}
                    </p>
                    <p className="truncate text-xs font-normal text-slate-500">
                        {report.developer.developer_code} ·{' '}
                        {formatDate(report.report_date)}
                    </p>
                </div>
            ),
        },
        {
            key: 'project',
            header: 'Project',
            cell: (report) =>
                report.project ? (
                    <div className="min-w-0 text-xs">
                        <p className="truncate font-bold text-slate-900">
                            {report.project.name}
                        </p>
                        <p className="text-slate-500">
                            {report.project.project_code}
                            {report.other_projects_count > 0
                                ? ` · +${report.other_projects_count} more`
                                : ''}
                        </p>
                    </div>
                ) : (
                    <span className="text-xs text-slate-500">No project</span>
                ),
        },
        {
            key: 'tasks',
            header: 'Tasks',
            cell: (report) => (
                <div className="min-w-24 space-y-1">
                    <ProgressBar
                        value={report.progress_percentage}
                        label="Report progress"
                    />
                    <p className="text-[11px] font-normal text-slate-500">
                        {report.tasks_count} task(s) ·{' '}
                        {report.progress_percentage}%
                    </p>
                </div>
            ),
        },
        {
            key: 'hours',
            header: 'Hours',
            cell: (report) => (
                <span className="text-xs">
                    {report.project_hours}h
                    <span className="text-slate-500">
                        {' '}
                        / {report.day_total_hours}h day
                    </span>
                </span>
            ),
        },
        {
            key: 'open',
            header: '',
            className: 'w-12',
            hideOnMobile: true,
            cell: (report) => (
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Open report of ${report.developer.name}`}
                    onClick={() => navigate(`/admin/reports/${report.id}`)}
                >
                    <Eye className="size-5" />
                </Button>
            ),
        },
    ];

    if (isError) {
        return (
            <ErrorState
                title="Could not load reports"
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

    const options = data?.filter_options;

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
                        Daily reports
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        {todayOnly
                            ? "Showing today's reports."
                            : 'Filtered by date.'}
                    </p>
                </div>
                {can('reports.export') ? (
                    <Button
                        variant="outline"
                        loading={exporting}
                        onClick={() => void exportFile()}
                    >
                        <Download className="size-4" /> Export
                    </Button>
                ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard
                    label="Reports today"
                    value={data?.summary.today.reports ?? '-'}
                />
                <StatCard
                    label="Hours today"
                    value={data ? `${data.summary.today.hours}h` : '-'}
                />
                <StatCard
                    label="Reports this month"
                    value={data?.summary.month.reports ?? '-'}
                />
                <StatCard
                    label="Hours this month"
                    value={data ? `${data.summary.month.hours}h` : '-'}
                />
            </div>

            <Tabs
                value={tab}
                onValueChange={(value) =>
                    set('tab', value === 'missing' ? 'missing' : null)
                }
            >
                <TabsList>
                    <TabsTrigger value="reports">Reports</TabsTrigger>
                    <TabsTrigger value="missing">
                        Not reported today
                        {data ? ` (${data.missing_today.length})` : ''}
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="reports" className="space-y-5">
                    <FilterBar
                        activeCount={activeFilters}
                        onReset={() =>
                            setParams(new URLSearchParams(), { replace: true })
                        }
                    >
                        <Field label="From" className="lg:w-40">
                            <Input
                                density="compact"
                                type="date"
                                value={filters.from_date ?? ''}
                                onChange={(event) =>
                                    set('from_date', event.target.value || null)
                                }
                            />
                        </Field>
                        <Field label="To" className="lg:w-40">
                            <Input
                                density="compact"
                                type="date"
                                value={filters.to_date ?? ''}
                                onChange={(event) =>
                                    set('to_date', event.target.value || null)
                                }
                            />
                        </Field>
                        <Field label="Employee" className="lg:w-52">
                            <Select
                                density="compact"
                                value={filters.developer_code ?? 'all'}
                                onValueChange={(value) =>
                                    set(
                                        'developer_code',
                                        value === 'all' ? null : value,
                                    )
                                }
                                options={[
                                    { value: 'all', label: 'All employees' },
                                    ...(options?.developers ?? []).map(
                                        (person) => ({
                                            value: person.developer_code,
                                            label: `${person.name} (${person.developer_code})`,
                                        }),
                                    ),
                                ]}
                            />
                        </Field>
                        <Field label="Project" className="lg:w-52">
                            <Select
                                density="compact"
                                value={filters.project_code ?? 'all'}
                                onValueChange={(value) =>
                                    set(
                                        'project_code',
                                        value === 'all' ? null : value,
                                    )
                                }
                                options={[
                                    { value: 'all', label: 'All projects' },
                                    ...(options?.projects ?? []).map(
                                        (project) => ({
                                            value: project.project_code,
                                            label: `${project.name} (${project.project_code})`,
                                        }),
                                    ),
                                ]}
                            />
                        </Field>
                        <Field label="Department" className="lg:w-44">
                            <Select
                                density="compact"
                                value={filters.department_id ?? 'all'}
                                onValueChange={(value) =>
                                    set(
                                        'department_id',
                                        value === 'all' ? null : value,
                                    )
                                }
                                options={[
                                    { value: 'all', label: 'All departments' },
                                    ...(options?.departments ?? []).map(
                                        (department) => ({
                                            value: String(department.id),
                                            label: department.name,
                                        }),
                                    ),
                                ]}
                            />
                        </Field>
                    </FilterBar>

                    <div
                        className={cn(
                            'space-y-3 transition-opacity',
                            isFetching && !isLoading && 'opacity-70',
                        )}
                    >
                        <DataTable
                            columns={columns}
                            rows={data?.reports}
                            rowKey={(report) => report.id}
                            loading={isLoading}
                            emptyTitle={
                                todayOnly && activeFilters === 0
                                    ? 'No reports today yet'
                                    : 'No report matches these filters'
                            }
                            onRowClick={(report) =>
                                navigate(`/admin/reports/${report.id}`)
                            }
                        />
                        {data ? (
                            <Pagination
                                page={data.meta.current_page}
                                pageCount={data.meta.last_page}
                                total={data.meta.total}
                                onPageChange={(next) =>
                                    set('page', String(next))
                                }
                            />
                        ) : null}
                    </div>
                </TabsContent>
                <TabsContent value="missing" className="space-y-3">
                    <div className="relative sm:ml-auto sm:w-64">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            aria-label="Search employees"
                            placeholder="Search employee"
                            density="compact"
                            value={missingSearch}
                            onChange={(event) =>
                                setMissingSearch(event.target.value)
                            }
                            className="pl-9"
                        />
                    </div>
                    {isLoading ? (
                        <Skeleton className="h-40 w-full" />
                    ) : missing.length === 0 ? (
                        <Card variant="flush">
                            <EmptyState
                                title={
                                    missingSearch
                                        ? 'No employee matches this search'
                                        : 'Everyone has reported today'
                                }
                            />
                        </Card>
                    ) : (
                        <Card className="p-4">
                            <ol className="gap-x-8 text-sm md:columns-2">
                                {missing.map((person, index) => (
                                    <li
                                        key={person.id}
                                        className="flex items-baseline gap-2 py-1"
                                    >
                                        <span className="w-6 shrink-0 text-right text-xs text-slate-400">
                                            {index + 1}.
                                        </span>
                                        <span className="font-semibold text-slate-900">
                                            {person.name}
                                        </span>
                                        <span className="text-xs text-slate-400">
                                            {person.developer_code}
                                        </span>
                                    </li>
                                ))}
                            </ol>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}

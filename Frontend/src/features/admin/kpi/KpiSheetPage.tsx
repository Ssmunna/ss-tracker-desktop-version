import { AlertTriangle, Trophy } from 'lucide-react';
import { useSearchParams } from 'react-router';

import type { KpiSheetRow } from '@/api/kpi-types';
import { useGetKpiSheetQuery } from '@/api/endpoints/kpi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { ErrorState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { FilterBar } from '@/components/ui/filter-bar';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { usePhaseLabel } from '@/hooks/usePhaseLabel';

import { KpiBreakdownDrawer } from './KpiBreakdownDrawer';
import { monthLabel } from './months';
import { PeriodFields } from './PeriodFilters';
import { useState } from 'react';

const sign = (value: number) => (value > 0 ? `+${value}` : String(value));

export function KpiSheetPage() {
    const { t } = usePhaseLabel();
    const [params, setParams] = useSearchParams();
    const now = new Date();
    const month = Number(params.get('month') ?? now.getMonth() + 1);
    const year = Number(params.get('year') ?? now.getFullYear());
    const departmentId = params.get('department_id') ?? undefined;
    const developerId = params.get('developer_id') ?? undefined;
    const { data, isLoading, isFetching, isError, refetch } =
        useGetKpiSheetQuery({
            month,
            year,
            department_id: departmentId,
            developer_id: developerId,
        });
    const [open, setOpen] = useState<KpiSheetRow | null>(null);

    const set = (next: Record<string, string | number | null>) => {
        const copy = new URLSearchParams(params);

        for (const [key, value] of Object.entries(next)) {
            if (value === null || value === '') {
                copy.delete(key);
            } else {
                copy.set(key, String(value));
            }
        }

        setParams(copy, { replace: true });
    };

    const columns: Column<KpiSheetRow>[] = [
        {
            key: 'name',
            header: 'Employee',
            primary: true,
            className: 'w-2/5',
            cell: (row) => (
                <div className="min-w-0">
                    <p className="font-bold text-slate-900">
                        {row.developer_name}
                        {row.reduced_weight_count > 0 ? (
                            <Badge
                                tone="danger"
                                className="ml-1.5 align-middle"
                                title={t(
                                    `${row.reduced_weight_count} phase(s) had a Failed deadline extension (weight halved)`,
                                )}
                            >
                                <AlertTriangle className="size-3" />
                                Failed ×½
                            </Badge>
                        ) : null}
                    </p>
                    <p className="truncate text-xs font-normal text-slate-500">
                        {row.developer_code}
                    </p>
                </div>
            ),
        },
        {
            key: 'department',
            header: 'Department',
            className: 'w-1/4',
            cell: (row) => (
                <span className="text-sm font-normal text-slate-700">
                    {row.department}
                </span>
            ),
        },
        {
            key: 'weight',
            header: 'Weight achieved %',
            className: 'text-center',
            cell: (row) => (
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                    <span className="font-bold text-slate-900">
                        {row.total_kpi_achievement}%
                    </span>
                    {row.adjustments_total !== 0 ? (
                        <Badge
                            tone={
                                row.adjustments_total > 0 ? 'success' : 'danger'
                            }
                        >
                            {sign(row.adjustments_total)}% adj.
                        </Badge>
                    ) : null}
                </div>
            ),
        },
        {
            key: 'kpi',
            header: 'KPI %',
            className: 'text-center',
            cell: (row) => (
                <span className="font-normal text-slate-700">
                    {row.personal_achievement_percentage}%
                </span>
            ),
        },
    ];

    if (isError) {
        return (
            <ErrorState
                title="Could not load the KPI sheet"
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
            <div>
                <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
                    KPI sheet
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                    {monthLabel(month, year)}. Select an employee for the phase
                    breakdown.
                </p>
            </div>

            <FilterBar
                activeCount={
                    Number(Boolean(departmentId)) + Number(Boolean(developerId))
                }
                onReset={() => set({ department_id: null, developer_id: null })}
            >
                <PeriodFields
                    month={month}
                    year={year}
                    onChange={(next) => set(next)}
                />
                <Field label="Department" className="lg:w-48">
                    <Select
                        density="compact"
                        value={departmentId ?? 'all'}
                        onValueChange={(value) =>
                            set({
                                department_id: value === 'all' ? null : value,
                            })
                        }
                        options={[
                            { value: 'all', label: 'All departments' },
                            ...(data?.departments ?? []).map((item) => ({
                                value: String(item.id),
                                label: item.name,
                            })),
                        ]}
                    />
                </Field>
                <Field label="Employee" className="lg:w-52">
                    <Select
                        density="compact"
                        value={developerId ?? 'all'}
                        onValueChange={(value) =>
                            set({
                                developer_id: value === 'all' ? null : value,
                            })
                        }
                        options={[
                            { value: 'all', label: 'All employees' },
                            ...(data?.all_developers ?? []).map((item) => ({
                                value: String(item.id),
                                label: `${item.name} (${item.developer_code})`,
                            })),
                        ]}
                    />
                </Field>
            </FilterBar>

            <div
                className={cn(
                    'grid gap-5 xl:grid-cols-3',
                    isFetching && !isLoading && 'opacity-70',
                )}
            >
                <div className="xl:col-span-2">
                    <DataTable
                        columns={columns}
                        rows={data?.developers}
                        rowKey={(row) => row.developer_id}
                        loading={isLoading}
                        emptyTitle="No employees match these filters"
                        onRowClick={setOpen}
                    />
                </div>
                <Card className="space-y-3 self-start">
                    <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                        <Trophy className="size-4 text-brand" /> Leaderboard
                    </h2>
                    {data && data.leaderboard.length === 0 ? (
                        <p className="text-sm text-slate-500">
                            No KPI metrics recorded for this month.
                        </p>
                    ) : (
                        <ol className="divide-y divide-slate-100">
                            {(data?.leaderboard ?? []).map((row, index) => (
                                <li
                                    key={row.developer_id}
                                    className="flex items-center gap-3 py-2.5"
                                >
                                    <span className="text-brand-700 flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold">
                                        {index + 1}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-bold text-slate-900">
                                            {row.developer_name}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            Output {row.raw_output_total} ·
                                            personal{' '}
                                            {
                                                row.personal_achievement_percentage
                                            }
                                            %
                                        </p>
                                    </div>
                                    <span className="text-sm font-bold text-slate-900">
                                        {row.total_kpi_achievement}%
                                    </span>
                                </li>
                            ))}
                        </ol>
                    )}
                </Card>
            </div>

            <KpiBreakdownDrawer
                row={open}
                month={month}
                year={year}
                onClose={() => setOpen(null)}
            />
        </div>
    );
}

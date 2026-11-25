import { History, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';

import { errorMessage, fieldErrors } from '@/api/baseApi';
import type { KpiSnapshot } from '@/api/kpi-types';
import {
    useAdjustKpiMutation,
    useGetKpiHistoryQuery,
    useGetKpiSheetQuery,
    useGetPhaseTimelineQuery,
} from '@/api/endpoints/kpi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { FilterBar } from '@/components/ui/filter-bar';
import { Input, Textarea } from '@/components/ui/input';
import { Modal, ModalClose, ModalContent } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDateTime } from '@/lib/date';
import { cn } from '@/lib/utils';
import { usePhaseLabel } from '@/hooks/usePhaseLabel';

import { monthLabel } from './months';
import { PeriodFields } from './PeriodFilters';

export function PhaseKpiHistoryPage() {
    const { phaseLabel, t } = usePhaseLabel();
    const { can } = usePermissions();
    const [params, setParams] = useSearchParams();
    const now = new Date();
    const month = Number(params.get('month') ?? now.getMonth() + 1);
    const year = Number(params.get('year') ?? now.getFullYear());
    const developerId = params.get('developer_id') ?? undefined;
    const { data, isLoading, isFetching, isError, refetch } =
        useGetKpiHistoryQuery({
            month,
            year,
            developer_id: developerId,
        });
    // The employee list for the filter comes with the sheet.
    const { data: sheet } = useGetKpiSheetQuery({ month, year });
    const [timeline, setTimeline] = useState<KpiSnapshot | null>(null);
    const [adjusting, setAdjusting] = useState<KpiSnapshot | null>(null);

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

    const columns: Column<KpiSnapshot>[] = [
        {
            key: 'phase',
            header: phaseLabel,
            primary: true,
            cell: (row) => (
                <div className="min-w-0">
                    <p className="truncate font-bold text-slate-900">
                        {row.phase ?? 'Phase'}
                    </p>
                    <p className="truncate text-xs font-normal text-slate-500">
                        {row.project_code} · {row.developer} (
                        {row.developer_code})
                    </p>
                </div>
            ),
        },
        {
            key: 'version',
            header: 'Version',
            cell: (row) => (
                <div className="flex flex-wrap gap-1">
                    <Badge>v{row.version_no}</Badge>
                    {row.is_current ? (
                        <Badge tone="success">Current</Badge>
                    ) : null}
                </div>
            ),
        },
        {
            key: 'awarded',
            header: 'Awarded',
            cell: (row) => (
                <div className="text-xs">
                    <p className="text-sm font-bold text-slate-900">
                        {row.awarded_kpi_percentage}%
                    </p>
                    <p className="text-slate-500">
                        weight {row.effective_weight_snapshot}% · done{' '}
                        {row.phase_completion_percentage_snapshot}% · share{' '}
                        {row.developer_contribution_percentage_snapshot}%
                    </p>
                </div>
            ),
        },
        {
            key: 'reason',
            header: 'Reason',
            hideOnMobile: true,
            cell: (row) => (
                <span className="text-xs text-slate-600">
                    {row.change_reason ?? '-'}
                </span>
            ),
        },
        {
            key: 'actions',
            header: '',
            cell: (row) => (
                <div
                    className="flex gap-2"
                    onClick={(event) => event.stopPropagation()}
                >
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setTimeline(row)}
                    >
                        <History className="size-4" /> Timeline
                    </Button>
                    {can('project-phases.kpi.adjust') && row.is_current ? (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setAdjusting(row)}
                        >
                            <SlidersHorizontal className="size-4" /> Adjust
                        </Button>
                    ) : null}
                </div>
            ),
        },
    ];

    if (isError) {
        return (
            <ErrorState
                title="Could not load the KPI history"
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
                    {t('Phase KPI history')}
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                    Every KPI version recorded for {monthLabel(month, year)}.
                </p>
            </div>

            <FilterBar
                activeCount={Number(Boolean(developerId))}
                onReset={() => set({ developer_id: null })}
            >
                <PeriodFields
                    month={month}
                    year={year}
                    onChange={(next) => set(next)}
                />
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
                            ...(sheet?.all_developers ?? []).map((item) => ({
                                value: String(item.id),
                                label: `${item.name} (${item.developer_code})`,
                            })),
                        ]}
                    />
                </Field>
            </FilterBar>

            <div
                className={cn(
                    'transition-opacity',
                    isFetching && !isLoading && 'opacity-70',
                )}
            >
                <DataTable
                    columns={columns}
                    rows={data?.snapshots}
                    rowKey={(row) => row.id}
                    loading={isLoading}
                    emptyTitle="No KPI recorded for this month"
                    onRowClick={setTimeline}
                />
            </div>

            <Drawer
                open={timeline !== null}
                onOpenChange={(open) => !open && setTimeline(null)}
            >
                <DrawerContent
                    title={
                        timeline
                            ? `${timeline.phase ?? phaseLabel} timeline`
                            : 'Timeline'
                    }
                    className="sm:max-w-lg"
                >
                    {timeline ? <Timeline phaseId={timeline.phase_id} /> : null}
                </DrawerContent>
            </Drawer>

            <Modal
                open={adjusting !== null}
                onOpenChange={(open) => !open && setAdjusting(null)}
            >
                {adjusting ? (
                    <AdjustForm
                        key={adjusting.id}
                        snapshot={adjusting}
                        onDone={() => setAdjusting(null)}
                    />
                ) : null}
            </Modal>
        </div>
    );
}

function Timeline({ phaseId }: { phaseId: number }) {
    const { data, isLoading, isError } = useGetPhaseTimelineQuery(phaseId);

    if (isError) {
        return <ErrorState title="Could not load the timeline" />;
    }

    if (isLoading || !data) {
        return (
            <div className="space-y-3 p-5">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
            </div>
        );
    }

    if (data.events.length === 0) {
        return <EmptyState title="No events yet" />;
    }

    return (
        <ol className="space-y-3 overflow-y-auto p-5">
            {data.events.map((event, index) => (
                <li
                    key={index}
                    className="rounded-xl border border-slate-200/90 p-3 text-xs text-slate-700"
                >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <Badge
                            tone={
                                event.type === 'adjustment'
                                    ? 'warning'
                                    : event.type === 'extension'
                                      ? 'info'
                                      : 'neutral'
                            }
                            className="capitalize"
                        >
                            {event.type}
                        </Badge>
                        <span className="text-slate-500">
                            {formatDateTime(event.at)}
                        </span>
                    </div>
                    <div className="mt-2 space-y-0.5">
                        {event.type === 'snapshot' ? (
                            <>
                                <p className="font-bold text-slate-900">
                                    {event.developer}: v{event.version_no}
                                    {event.is_current
                                        ? ' (current)'
                                        : ''} · {event.awarded_kpi_percentage}%
                                </p>
                                {event.change_reason ? (
                                    <p>{event.change_reason}</p>
                                ) : null}
                            </>
                        ) : null}
                        {event.type === 'adjustment' ? (
                            <>
                                <p className="font-bold text-slate-900">
                                    {event.developer}:{' '}
                                    {(event.adjustment_percentage ?? 0) > 0
                                        ? '+'
                                        : ''}
                                    {event.adjustment_percentage}%
                                </p>
                                <p>{event.reason}</p>
                            </>
                        ) : null}
                        {event.type === 'extension' ? (
                            <>
                                <p className="font-bold text-slate-900">
                                    {event.extension_type} extension, weight{' '}
                                    {event.previous_weight ?? '-'}% →{' '}
                                    {event.new_weight ?? '-'}%
                                </p>
                                {event.review_note ? (
                                    <p>{event.review_note}</p>
                                ) : null}
                            </>
                        ) : null}
                    </div>
                </li>
            ))}
        </ol>
    );
}

function AdjustForm({
    snapshot,
    onDone,
}: {
    snapshot: KpiSnapshot;
    onDone: () => void;
}) {
    const [adjust, { isLoading }] = useAdjustKpiMutation();
    const [percentage, setPercentage] = useState('');
    const [reason, setReason] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    return (
        <ModalContent
            title="Adjust KPI"
            description={`${snapshot.developer}, ${snapshot.phase}`}
            footer={
                <>
                    <ModalClose asChild>
                        <Button variant="secondary">Cancel</Button>
                    </ModalClose>
                    <Button type="submit" form="kpi-adjust" loading={isLoading}>
                        Record adjustment
                    </Button>
                </>
            }
        >
            <form
                id="kpi-adjust"
                className="space-y-4 pt-1"
                onSubmit={async (event) => {
                    event.preventDefault();
                    const value = Number(percentage);
                    const local: Record<string, string> = {};

                    if (
                        percentage.trim() === '' ||
                        Number.isNaN(value) ||
                        value < -100 ||
                        value > 100
                    ) {
                        local.adjustment_percentage =
                            'Enter a number between -100 and 100.';
                    }

                    if (!reason.trim()) {
                        local.reason = 'A reason is required.';
                    }

                    setErrors(local);

                    if (Object.keys(local).length > 0) {
                        return;
                    }

                    try {
                        await adjust({
                            snapshotId: snapshot.id,
                            adjustment_percentage: value,
                            reason: reason.trim(),
                        }).unwrap();
                        toast.success('KPI adjustment recorded.');
                        onDone();
                    } catch (error) {
                        const fields = fieldErrors(error);
                        setErrors(fields);

                        if (Object.keys(fields).length === 0) {
                            toast.error(errorMessage(error));
                        }
                    }
                }}
            >
                <Field
                    label="Adjustment (%)"
                    required
                    hint={`Positive adds, negative removes. Awarded now: ${snapshot.awarded_kpi_percentage}%`}
                    error={errors.adjustment_percentage}
                >
                    <Input
                        type="number"
                        step="0.01"
                        min={-100}
                        max={100}
                        value={percentage}
                        onChange={(event) => setPercentage(event.target.value)}
                    />
                </Field>
                <Field label="Reason" required error={errors.reason}>
                    <Textarea
                        rows={3}
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                    />
                </Field>
            </form>
        </ModalContent>
    );
}

import { Link } from 'react-router';

import type { KpiBreakdownRow, KpiSheetRow } from '@/api/kpi-types';
import { useGetKpiBreakdownQuery } from '@/api/endpoints/kpi';
import { Badge } from '@/components/ui/badge';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { Modal, ModalContent } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/date';
import { cn } from '@/lib/utils';
import { usePhaseLabel } from '@/hooks/usePhaseLabel';

import { monthLabel } from './months';

const cell = 'border border-slate-200 px-3 py-3 align-middle';

/** Weight breakdown by project and phase for one employee and month, plus manual adjustments. */
export function KpiBreakdownDrawer({
    row,
    month,
    year,
    onClose,
}: {
    row: KpiSheetRow | null;
    month: number;
    year: number;
    onClose: () => void;
}) {
    return (
        <Modal open={row !== null} onOpenChange={(open) => !open && onClose()}>
            {row ? (
                <ModalContent
                    size="lg"
                    title={`${row.developer_name} (${row.developer_code})`}
                    description={`Weight breakdown by project · ${monthLabel(month, year)}`}
                >
                    <Body row={row} month={month} year={year} />
                </ModalContent>
            ) : null}
        </Modal>
    );
}

function Body({
    row,
    month,
    year,
}: {
    row: KpiSheetRow;
    month: number;
    year: number;
}) {
    const { t, phaseLabel } = usePhaseLabel();
    const { data, isLoading, isError } = useGetKpiBreakdownQuery({
        developer_id: row.developer_id,
        month,
        year,
    });

    if (isError) {
        return <ErrorState title="Could not load the breakdown" />;
    }

    if (isLoading || !data) {
        return <Skeleton className="h-32 w-full" />;
    }

    const adjusted = data.snapshots.some((item) => item.weight_adjusted);
    const failed = data.snapshots.some((item) => item.row_type === 'failed');

    return (
        <div className="space-y-4 border-t border-slate-100 pt-4">
            {data.snapshots.length === 0 ? (
                <EmptyState title={t('No phases this month')} />
            ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr className="bg-slate-50 text-[11px] font-bold tracking-wide text-slate-500 uppercase">
                                <th className={cn(cell, 'text-left')}>
                                    Project
                                </th>
                                <th className={cn(cell, 'text-left')}>
                                    {phaseLabel}
                                </th>
                                <th className={cn(cell, 'text-center')}>
                                    Base weight
                                </th>
                                <th className={cn(cell, 'text-center')}>
                                    Effective weight
                                </th>
                                <th className={cn(cell, 'text-center')}>
                                    Awarded KPI %
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.snapshots.map((item) => (
                                <BreakdownRow
                                    key={`${item.phase_id}-${item.row_type}`}
                                    item={item}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {adjusted ? (
                <p className="text-xs text-slate-500">
                    <span className="font-semibold text-slate-600">Note:</span>{' '}
                    Effective weight is the value used in the KPI award. A
                    Failed deadline extension awards half the base weight; a
                    Regular extension keeps the full base weight.
                </p>
            ) : null}
            {failed ? (
                <p className="text-xs text-slate-500">
                    {t(
                        'Failed rows are phases that failed. They are shown for visibility, award 0% and are not counted in the total.',
                    )}
                </p>
            ) : null}
            {data.adjustments.length > 0 ? (
                <div className="space-y-2">
                    <h3 className="text-sm font-bold text-slate-900">
                        Adjustments
                    </h3>
                    <ul className="space-y-2">
                        {data.adjustments.map((adjustment) => (
                            <li
                                key={adjustment.id}
                                className="rounded-xl bg-slate-50 p-3 text-xs text-slate-700"
                            >
                                <p className="font-bold text-slate-900">
                                    {adjustment.adjustment_percentage > 0
                                        ? '+'
                                        : ''}
                                    {adjustment.adjustment_percentage}%
                                </p>
                                <p>{adjustment.reason}</p>
                                <p className="text-slate-500">
                                    {adjustment.approved_by ?? 'Unknown'} ·{' '}
                                    {formatDateTime(adjustment.approved_at)}
                                </p>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}
        </div>
    );
}

function BreakdownRow({ item }: { item: KpiBreakdownRow }) {
    const isFailed = item.row_type === 'failed';

    return (
        <tr className={isFailed ? 'bg-rose-50/60' : undefined}>
            <td className={cn(cell, 'text-slate-800')}>
                {item.project_id ? (
                    <Link
                        className="hover:underline"
                        to={`/admin/projects/${item.project_id}`}
                    >
                        {item.project_name ?? '—'}
                    </Link>
                ) : (
                    (item.project_name ?? '—')
                )}
                {item.project_code ? (
                    <span className="ml-1 text-xs text-slate-400">
                        ({item.project_code})
                    </span>
                ) : null}
            </td>
            <td className={cn(cell, 'text-slate-700')}>
                {item.phase_name ?? '—'}
                {isFailed ? (
                    <Badge tone="danger" className="ml-1.5">
                        Failed
                    </Badge>
                ) : null}
            </td>
            <td className={cn(cell, 'text-center text-slate-500')}>
                {item.phase_weight}%
            </td>
            <td className={cn(cell, 'text-center text-slate-800')}>
                {item.effective_weight}%
                {item.weight_adjusted ? (
                    <Badge
                        tone={
                            item.extension_type === 'Failed'
                                ? 'danger'
                                : 'warning'
                        }
                        className="ml-1.5"
                    >
                        {item.extension_type === 'Failed'
                            ? 'Failed ×½'
                            : 'Extended'}
                    </Badge>
                ) : null}
            </td>
            <td className={cn(cell, 'text-center font-bold text-slate-900')}>
                {item.awarded_kpi_percentage}%
            </td>
        </tr>
    );
}

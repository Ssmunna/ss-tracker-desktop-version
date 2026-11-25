import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { Card } from './card';
import { EmptyState } from './empty-state';
import { Skeleton } from './skeleton';

export interface Column<T> {
    key: string;
    header: string;
    cell: (row: T) => ReactNode;
    className?: string;
    /** Shown as the card title on phones (first column by default). */
    primary?: boolean;
    /** Hide this column in the phone card layout. */
    hideOnMobile?: boolean;
}

interface DataTableProps<T> {
    columns: Column<T>[];
    rows: T[] | undefined;
    rowKey: (row: T) => string | number;
    loading?: boolean;
    emptyTitle?: string;
    emptyDescription?: string;
    onRowClick?: (row: T) => void;
    /** Below `md` render each row as a card instead of a scrolling table. */
    cardsOnMobile?: boolean;
}

/** Table inside a standard card (guide s4). Rows hover `bg-slate-50` (s5). */
export function DataTable<T>({
    columns,
    rows,
    rowKey,
    loading = false,
    emptyTitle = 'Nothing here yet',
    emptyDescription,
    onRowClick,
    cardsOnMobile = true,
}: DataTableProps<T>) {
    if (loading) {
        return (
            <Card variant="flush" className="space-y-3 p-4">
                {Array.from({ length: 5 }, (_, index) => (
                    <Skeleton key={index} className="h-10 w-full" />
                ))}
            </Card>
        );
    }

    if (!rows || rows.length === 0) {
        return (
            <Card variant="flush">
                <EmptyState title={emptyTitle} description={emptyDescription} />
            </Card>
        );
    }

    const primary = columns.find((column) => column.primary) ?? columns[0];

    return (
        <>
            {cardsOnMobile ? (
                <ul className="space-y-3 md:hidden">
                    {rows.map((row) => (
                        <li key={rowKey(row)}>
                            <Card
                                variant="standard"
                                interactive={Boolean(onRowClick)}
                                onClick={
                                    onRowClick
                                        ? () => onRowClick(row)
                                        : undefined
                                }
                                className={cn(
                                    'space-y-2',
                                    onRowClick && 'cursor-pointer',
                                )}
                            >
                                <div className="text-sm font-bold text-slate-900">
                                    {primary.cell(row)}
                                </div>
                                <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
                                    {columns
                                        .filter(
                                            (column) =>
                                                column !== primary &&
                                                !column.hideOnMobile,
                                        )
                                        .map((column) => (
                                            <div
                                                key={column.key}
                                                className="min-w-0"
                                            >
                                                <dt className="text-[11px] font-medium text-slate-400">
                                                    {column.header}
                                                </dt>
                                                <dd className="min-w-0 text-xs font-medium text-slate-900">
                                                    {column.cell(row)}
                                                </dd>
                                            </div>
                                        ))}
                                </dl>
                            </Card>
                        </li>
                    ))}
                </ul>
            ) : null}

            <Card
                variant="flush"
                className={cn(
                    'overflow-x-auto',
                    cardsOnMobile && 'hidden md:block',
                )}
            >
                <table className="w-full min-w-[40rem] text-left text-sm">
                    <thead>
                        <tr className="border-b border-slate-200/90">
                            {columns.map((column) => (
                                <th
                                    key={column.key}
                                    scope="col"
                                    className={cn(
                                        'px-4 py-3 text-[11px] font-bold tracking-wide text-slate-500 uppercase',
                                        column.className,
                                    )}
                                >
                                    {column.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr
                                key={rowKey(row)}
                                onClick={
                                    onRowClick
                                        ? () => onRowClick(row)
                                        : undefined
                                }
                                className={cn(
                                    'border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50',
                                    onRowClick && 'cursor-pointer',
                                )}
                            >
                                {columns.map((column) => (
                                    <td
                                        key={column.key}
                                        className={cn(
                                            'px-4 py-3 text-slate-900',
                                            column.className,
                                        )}
                                    >
                                        {column.cell(row)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
        </>
    );
}

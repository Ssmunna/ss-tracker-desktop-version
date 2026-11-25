import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';

import type { ActivityLog } from '@/api/org-types';
import { useGetActivityLogsQuery } from '@/api/endpoints/org';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { FilterBar } from '@/components/ui/filter-bar';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/date';
import { cn } from '@/lib/utils';

import { PageHeader } from './shared';

const KEYS = [
    'from_date',
    'to_date',
    'user_id',
    'department_id',
    'log_name',
    'event',
] as const;

const eventTone = (event: string) =>
    event === 'deleted' || event === 'force-deleted' || event === 'rejected'
        ? 'danger'
        : event === 'created' || event === 'approved' || event === 'restored'
          ? 'success'
          : 'info';

const show = (value: unknown) =>
    value === null || value === undefined || value === ''
        ? '-'
        : typeof value === 'object'
          ? JSON.stringify(value)
          : String(value);

export function ActivityLogsPage() {
    const [params, setParams] = useSearchParams();
    const filters: Record<string, string> = {};

    for (const key of KEYS) {
        const value = params.get(key);

        if (value) {
            filters[key] = value;
        }
    }

    const page = Number(params.get('page') ?? 1);
    const { data, isLoading, isFetching, isError, refetch } =
        useGetActivityLogsQuery({ ...filters, page, per_page: 25 });
    const todayOnly = !filters.from_date && !filters.to_date;
    const active = Object.keys(filters).length;

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

    const options = data?.filter_options;
    const select = (
        key: string,
        label: string,
        items: { value: string; label: string }[],
        width = 'lg:w-44',
    ) => (
        <Field label={label} className={width}>
            <Select
                density="compact"
                value={filters[key] ?? 'all'}
                onValueChange={(value) =>
                    set(key, value === 'all' ? null : value)
                }
                options={[{ value: 'all', label: 'Any' }, ...items]}
            />
        </Field>
    );

    if (isError) {
        return (
            <ErrorState
                title="Could not load the activity log"
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
                title="Activity logs"
                description={
                    todayOnly
                        ? "Showing today's activity."
                        : 'Filtered by date.'
                }
            />
            <FilterBar
                activeCount={active}
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
                {select(
                    'user_id',
                    'User',
                    (options?.users ?? []).map((user) => ({
                        value: String(user.id),
                        label: user.name,
                    })),
                    'lg:w-48',
                )}
                {select(
                    'department_id',
                    'Department',
                    (options?.departments ?? []).map((item) => ({
                        value: String(item.id),
                        label: item.name,
                    })),
                )}
                {select(
                    'log_name',
                    'Area',
                    (options?.log_names ?? []).map((name) => ({
                        value: name,
                        label: name,
                    })),
                )}
                {select(
                    'event',
                    'Event',
                    (options?.events ?? []).map((name) => ({
                        value: name,
                        label: name,
                    })),
                    'lg:w-40',
                )}
            </FilterBar>

            {isLoading ? (
                <div className="space-y-3">
                    {Array.from({ length: 5 }, (_, index) => (
                        <Skeleton key={index} className="h-16 w-full" />
                    ))}
                </div>
            ) : data && data.logs.length === 0 ? (
                <Card variant="flush">
                    <EmptyState
                        title={
                            active > 0
                                ? 'No activity matches these filters'
                                : 'No activity today'
                        }
                    />
                </Card>
            ) : (
                <ul
                    className={cn(
                        'space-y-3 transition-opacity',
                        isFetching && 'opacity-70',
                    )}
                >
                    {data?.logs.map((log) => (
                        <LogItem key={log.id} log={log} />
                    ))}
                </ul>
            )}
            {data ? (
                <Pagination
                    page={data.meta.current_page}
                    pageCount={data.meta.last_page}
                    total={data.meta.total}
                    onPageChange={(next) => set('page', String(next))}
                />
            ) : null}
        </div>
    );
}

function LogItem({ log }: { log: ActivityLog }) {
    const [open, setOpen] = useState(false);
    const changes = log.properties;
    const keys = Array.from(
        new Set([
            ...Object.keys(changes?.old ?? {}),
            ...Object.keys(changes?.new ?? {}),
        ]),
    );

    return (
        <li>
            <Card className="space-y-2">
                <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpen((value) => !value)}
                    className="flex min-h-11 w-full items-start justify-between gap-3 text-left"
                >
                    <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge
                                tone={eventTone(log.event)}
                                className="capitalize"
                            >
                                {log.event}
                            </Badge>
                            <Badge>{log.log_name}</Badge>
                        </div>
                        <p className="text-sm text-slate-900">
                            {log.description ??
                                `${log.subject_type ?? 'Item'} ${log.subject_name ?? ''}`}
                        </p>
                        <p className="text-xs text-slate-500">
                            {log.causer?.name ?? 'System'} ·{' '}
                            {formatDateTime(log.created_at)}
                            {log.project_name ? ` · ${log.project_name}` : ''}
                        </p>
                    </div>
                    <ChevronDown
                        className={cn(
                            'mt-1 size-4 shrink-0 text-slate-400 transition-transform',
                            open && 'rotate-180',
                        )}
                    />
                </button>
                {open ? (
                    <div className="space-y-3 border-t border-slate-100 pt-3 text-xs">
                        {keys.length > 0 ? (
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-slate-500">
                                        <th className="py-1 pr-2 font-bold">
                                            Field
                                        </th>
                                        <th className="py-1 pr-2 font-bold">
                                            Before
                                        </th>
                                        <th className="py-1 font-bold">
                                            After
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {keys.map((key) => (
                                        <tr
                                            key={key}
                                            className="border-t border-slate-100 align-top"
                                        >
                                            <td className="py-1.5 pr-2 font-bold text-slate-700">
                                                {key}
                                            </td>
                                            <td className="py-1.5 pr-2 break-all text-slate-600">
                                                {show(changes?.old?.[key])}
                                            </td>
                                            <td className="py-1.5 break-all text-slate-900">
                                                {show(changes?.new?.[key])}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="text-slate-500">
                                No field changes recorded.
                            </p>
                        )}
                        <p className="break-all text-slate-500">
                            {log.ip_address ?? 'No IP'}
                            {log.user_agent ? ` · ${log.user_agent}` : ''}
                        </p>
                    </div>
                ) : null}
            </Card>
        </li>
    );
}

import {
    AlertTriangle,
    CheckCircle2,
    Clock,
    Loader,
    Ticket,
    Users,
} from 'lucide-react';
import { Link } from 'react-router';

import { useGetTicketingOverviewQuery } from '@/api/endpoints/ticketing';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { PageHeader } from '@/features/admin/org/shared';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDate } from '@/lib/date';

import { PRIORITIES, TICKET_STATUSES, label } from './constants';

/** A labelled horizontal bar; `max` sets the scale shared by the bars of one group. */
function Bar({
    name,
    value,
    max,
}: {
    name: string;
    value: number;
    max: number;
}) {
    return (
        <div className="flex items-center gap-3 text-xs">
            <span className="w-24 shrink-0 text-slate-600">{name}</span>
            <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }}
                />
            </div>
            <span className="w-8 shrink-0 text-right font-bold text-slate-900">
                {value}
            </span>
        </div>
    );
}

export function TicketingOverviewPage() {
    const { can } = usePermissions();
    const { data, isLoading, isError, refetch } =
        useGetTicketingOverviewQuery();

    if (isError) {
        return (
            <ErrorState
                title="Could not load the Ticketing overview"
                description="The Ticketing platform may be unreachable or not configured."
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

    const by = data?.tickets.by_status;
    const maxStatus = by ? Math.max(...Object.values(by), 0) : 0;
    const maxPriority = data
        ? Math.max(...Object.values(data.tickets.by_priority), 0)
        : 0;
    const maxDay = data
        ? Math.max(...data.tickets.last_7_days.map((d) => d.count), 0)
        : 0;

    return (
        <div className="space-y-5">
            <PageHeader
                title="Ticketing"
                description="Support tickets from every client that uses the Ticketing SDK."
                action={
                    <div className="flex gap-2">
                        <Button asChild variant="outline">
                            <Link to="/admin/ticketing/tickets">Tickets</Link>
                        </Button>
                        <Button asChild>
                            <Link to="/admin/ticketing/clients">Clients</Link>
                        </Button>
                    </div>
                }
            />

            {data && data.webhooks.failing > 0 ? (
                <Card variant="tinted" className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
                    <div className="text-sm">
                        <p className="font-bold text-slate-900">
                            {data.webhooks.failing} webhook deliver
                            {data.webhooks.failing === 1
                                ? 'y is'
                                : 'ies are'}{' '}
                            failing
                        </p>
                        <p className="text-xs text-slate-600">
                            {data.webhooks.exhausted} gave up after all retries.
                            {can('ticketing.webhooks.view')
                                ? ' Open a client and its Webhooks tab to retry them.'
                                : ''}
                        </p>
                    </div>
                </Card>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {isLoading || !data || !by ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-28 rounded-2xl" />
                    ))
                ) : (
                    <>
                        <StatCard
                            label="Total tickets"
                            value={data.tickets.total}
                            icon={Ticket}
                            hint="Across all clients"
                            highlight
                        />
                        <StatCard
                            label="Pending"
                            value={by.pending}
                            icon={Clock}
                            hint="Waiting to be picked up"
                            delay={60}
                        />
                        <StatCard
                            label="In flight"
                            value={by.open + by.in_progress}
                            icon={Loader}
                            hint={`${by.open} open · ${by.in_progress} in progress`}
                            delay={120}
                        />
                        <StatCard
                            label="Active clients"
                            value={data.clients.by_status.active}
                            icon={Users}
                            hint={`${data.clients.total} in total`}
                            delay={180}
                        />
                    </>
                )}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <Card className="space-y-3">
                    <CardTitle>By status</CardTitle>
                    {data && by ? (
                        TICKET_STATUSES.map((status) => (
                            <Bar
                                key={status}
                                name={label(status)}
                                value={by[status]}
                                max={maxStatus}
                            />
                        ))
                    ) : (
                        <Skeleton className="h-40" />
                    )}
                </Card>
                <Card className="space-y-3">
                    <CardTitle>By priority</CardTitle>
                    {data ? (
                        PRIORITIES.map((priority) => (
                            <Bar
                                key={priority}
                                name={label(priority)}
                                value={data.tickets.by_priority[priority]}
                                max={maxPriority}
                            />
                        ))
                    ) : (
                        <Skeleton className="h-40" />
                    )}
                </Card>
                <Card className="space-y-3 lg:col-span-2">
                    <CardTitle>New tickets, last 7 days</CardTitle>
                    {data ? (
                        <div className="flex h-32 items-end gap-2">
                            {data.tickets.last_7_days.map((day) => (
                                <div
                                    key={day.date}
                                    className="flex min-w-0 flex-1 flex-col items-center gap-1"
                                >
                                    <span className="text-[11px] font-bold text-slate-900">
                                        {day.count}
                                    </span>
                                    <div
                                        className="w-full rounded-t-md bg-brand"
                                        style={{
                                            height: `${maxDay > 0 ? Math.max((day.count / maxDay) * 80, day.count > 0 ? 4 : 0) : 0}px`,
                                        }}
                                    />
                                    <span className="text-[10px] text-slate-500">
                                        {formatDate(day.date).replace(
                                            /,? \d{4}$/,
                                            '',
                                        )}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <Skeleton className="h-32" />
                    )}
                </Card>
            </div>

            {data && data.tickets.total === 0 ? (
                <p className="flex items-center gap-2 text-xs text-slate-500">
                    <CheckCircle2 className="size-4" /> No tickets yet. They
                    appear here as soon as a client submits one through the SDK.
                </p>
            ) : null}
        </div>
    );
}

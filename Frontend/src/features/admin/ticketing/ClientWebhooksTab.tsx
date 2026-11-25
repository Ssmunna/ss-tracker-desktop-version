import { RotateCw } from 'lucide-react';
import { useState } from 'react';

import {
    useGetTicketingWebhooksQuery,
    useRetryTicketingWebhookMutation,
} from '@/api/endpoints/ticketing';
import type { DeliveryState, WebhookDelivery } from '@/api/ticketing-types';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/ui/data-table';
import { ErrorState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Pagination } from '@/components/ui/pagination';
import { Select } from '@/components/ui/select';
import { usePermissions } from '@/hooks/usePermissions';
import { useRun } from '@/hooks/useRun';
import { formatDateTime } from '@/lib/date';

import { label } from './constants';
import { DeliveryBadge } from './shared';

const STATES: DeliveryState[] = ['pending', 'success', 'failed', 'exhausted'];

/** Every webhook sent to this client, each attempt's result, and a manual retry. */
export function ClientWebhooksTab({ clientId }: { clientId: number }) {
    const { can } = usePermissions();
    const run = useRun();
    const [state, setState] = useState<DeliveryState | ''>('');
    const [page, setPage] = useState(1);
    const { data, isLoading, isError, refetch } = useGetTicketingWebhooksQuery({
        clientId,
        state,
        page,
    });
    const [retry] = useRetryTicketingWebhookMutation();

    const columns: Column<WebhookDelivery>[] = [
        {
            key: 'event',
            header: 'Delivery',
            primary: true,
            cell: (d) => (
                <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900">
                        {String(
                            d.payload.ticket_number ?? `Ticket #${d.ticket_id}`,
                        )}
                    </p>
                    <p className="truncate text-[11px] text-slate-500">
                        {d.payload.old_status
                            ? `${label(String(d.payload.old_status))} → ${label(String(d.payload.new_status))}`
                            : d.event}
                    </p>
                </div>
            ),
        },
        {
            key: 'state',
            header: 'State',
            cell: (d) => <DeliveryBadge state={d.state} />,
        },
        {
            key: 'attempt',
            header: 'Attempts',
            hideOnMobile: true,
            cell: (d) => <span className="text-xs">{d.attempt}</span>,
        },
        {
            key: 'response',
            header: 'Response',
            hideOnMobile: true,
            cell: (d) => (
                <span
                    className="block max-w-56 truncate text-xs"
                    title={d.response_excerpt ?? undefined}
                >
                    {d.response_status ?? '-'}
                    {d.response_excerpt ? ` · ${d.response_excerpt}` : ''}
                </span>
            ),
        },
        {
            key: 'next',
            header: 'Next retry',
            hideOnMobile: true,
            cell: (d) => (
                <span className="text-xs">
                    {formatDateTime(d.next_retry_at)}
                </span>
            ),
        },
        {
            key: 'actions',
            header: '',
            className: 'w-24',
            cell: (d) =>
                can('ticketing.webhooks.retry') &&
                (d.state === 'failed' || d.state === 'exhausted') ? (
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                            void run(retry(d.id), 'Delivery re-queued.')
                        }
                    >
                        <RotateCw className="size-3.5" /> Retry
                    </Button>
                ) : null,
        },
    ];

    if (isError) {
        return (
            <ErrorState
                title="Could not load deliveries"
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
        <div className="space-y-3">
            <Field label="State" className="w-44">
                <Select
                    density="compact"
                    value={state || 'all'}
                    onValueChange={(value) => {
                        setState(
                            value === 'all' ? '' : (value as DeliveryState),
                        );
                        setPage(1);
                    }}
                    options={[
                        { value: 'all', label: 'All' },
                        ...STATES.map((value) => ({
                            value,
                            label: label(value),
                        })),
                    ]}
                />
            </Field>
            <DataTable
                columns={columns}
                rows={data?.items}
                rowKey={(d) => d.id}
                loading={isLoading}
                emptyTitle="No webhook deliveries"
                emptyDescription="A delivery is recorded each time a ticket's status changes and the client has a webhook URL."
            />
            {data ? (
                <Pagination
                    page={data.meta.page}
                    pageCount={data.meta.last_page}
                    total={data.meta.total}
                    onPageChange={setPage}
                />
            ) : null}
        </div>
    );
}

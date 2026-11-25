import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import {
    useGetTicketingClientsQuery,
    useGetTicketingTicketsQuery,
} from '@/api/endpoints/ticketing';
import type { TicketingTicket } from '@/api/ticketing-types';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/ui/data-table';
import { ErrorState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { FilterBar } from '@/components/ui/filter-bar';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Select } from '@/components/ui/select';
import { PageHeader } from '@/features/admin/org/shared';
import { formatDateTime } from '@/lib/date';

import { priorityOptions, statusOptions } from './constants';
import { PriorityBadge, StatusBadge } from './shared';
import { useUrlParams } from './useUrlParams';

export function TicketingTicketsPage() {
    const navigate = useNavigate();
    const { params, set, reset } = useUrlParams();
    const clientId = params.get('client_id') ?? '';
    const status = params.get('status') ?? '';
    const priority = params.get('priority') ?? '';
    const search = params.get('search') ?? '';
    const from = params.get('from') ?? '';
    const to = params.get('to') ?? '';
    const page = Number(params.get('page') ?? 1);
    const [draft, setDraft] = useState(search);
    const clients = useGetTicketingClientsQuery({ per_page: 100 });
    const { data, isLoading, isError, refetch } = useGetTicketingTicketsQuery({
        client_id: clientId,
        status,
        priority,
        search,
        from,
        // The platform compares timestamps, so the last day must run to its end.
        to: to ? `${to} 23:59:59` : '',
        page,
    });

    useEffect(() => {
        if (draft === search) {
            return;
        }

        const timer = window.setTimeout(
            () => set({ search: draft.trim() || null }),
            400,
        );

        return () => window.clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [draft]);

    const columns: Column<TicketingTicket>[] = [
        {
            key: 'ticket',
            header: 'Ticket',
            primary: true,
            cell: (ticket) => (
                <div className="min-w-0">
                    <p className="truncate font-bold text-slate-900">
                        {ticket.subject}
                    </p>
                    <p className="truncate text-xs font-normal text-slate-500">
                        {ticket.ticket_number}
                    </p>
                </div>
            ),
        },
        {
            key: 'client',
            header: 'Client',
            hideOnMobile: true,
            cell: (ticket) => (
                <span className="text-xs">
                    {ticket.client?.name ?? `#${ticket.client_id}`}
                </span>
            ),
        },
        {
            key: 'customer',
            header: 'Customer',
            hideOnMobile: true,
            cell: (ticket) => (
                <div className="min-w-0 text-xs">
                    <p className="truncate">{ticket.customer_name}</p>
                    <p className="truncate text-slate-500">
                        {ticket.customer_email}
                    </p>
                </div>
            ),
        },
        {
            key: 'priority',
            header: 'Priority',
            cell: (ticket) => <PriorityBadge priority={ticket.priority} />,
        },
        {
            key: 'status',
            header: 'Status',
            cell: (ticket) => <StatusBadge status={ticket.status} />,
        },
        {
            key: 'created',
            header: 'Created',
            hideOnMobile: true,
            cell: (ticket) => (
                <span className="text-xs whitespace-nowrap">
                    {formatDateTime(ticket.created_at)}
                </span>
            ),
        },
    ];

    if (isError) {
        return (
            <ErrorState
                title="Could not load tickets"
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

    const active = [clientId, status, priority, search, from, to].filter(
        Boolean,
    ).length;

    return (
        <div className="space-y-5">
            <PageHeader
                title="Tickets"
                description={data ? `${data.meta.total} ticket(s)` : undefined}
            />
            <FilterBar
                activeCount={active}
                onReset={() => {
                    setDraft('');
                    reset();
                }}
            >
                <Field label="Client" className="lg:w-48">
                    <Select
                        density="compact"
                        value={clientId || 'all'}
                        onValueChange={(value) =>
                            set({ client_id: value === 'all' ? null : value })
                        }
                        options={[
                            { value: 'all', label: 'All clients' },
                            ...(clients.data?.items ?? []).map((client) => ({
                                value: String(client.id),
                                label: client.name,
                            })),
                        ]}
                    />
                </Field>
                <Field label="Status" className="lg:w-40">
                    <Select
                        density="compact"
                        value={status || 'all'}
                        onValueChange={(value) =>
                            set({ status: value === 'all' ? null : value })
                        }
                        options={[
                            { value: 'all', label: 'All' },
                            ...statusOptions,
                        ]}
                    />
                </Field>
                <Field label="Priority" className="lg:w-36">
                    <Select
                        density="compact"
                        value={priority || 'all'}
                        onValueChange={(value) =>
                            set({ priority: value === 'all' ? null : value })
                        }
                        options={[
                            { value: 'all', label: 'All' },
                            ...priorityOptions,
                        ]}
                    />
                </Field>
                <Field label="From" className="lg:w-36">
                    <Input
                        type="date"
                        density="compact"
                        value={from}
                        onChange={(event) =>
                            set({ from: event.target.value || null })
                        }
                    />
                </Field>
                <Field label="To" className="lg:w-36">
                    <Input
                        type="date"
                        density="compact"
                        value={to}
                        onChange={(event) =>
                            set({ to: event.target.value || null })
                        }
                    />
                </Field>
                <Field label="Search" className="lg:ml-auto lg:w-64">
                    <div className="relative">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            density="compact"
                            className="pl-9"
                            placeholder="Number, email or subject"
                            value={draft}
                            onChange={(event) => setDraft(event.target.value)}
                        />
                    </div>
                </Field>
            </FilterBar>
            <DataTable
                columns={columns}
                rows={data?.items}
                rowKey={(ticket) => ticket.id}
                loading={isLoading}
                onRowClick={(ticket) =>
                    navigate(`/admin/ticketing/tickets/${ticket.id}`)
                }
                emptyTitle={
                    active > 0
                        ? 'No ticket matches these filters'
                        : 'No tickets yet'
                }
            />
            {data ? (
                <Pagination
                    page={data.meta.page}
                    pageCount={data.meta.last_page}
                    total={data.meta.total}
                    onPageChange={(next) => set({ page: String(next) })}
                />
            ) : null}
        </div>
    );
}

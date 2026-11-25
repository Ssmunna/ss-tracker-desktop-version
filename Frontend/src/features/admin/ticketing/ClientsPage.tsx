import {
    ExternalLink,
    MoreHorizontal,
    Pause,
    Pencil,
    Play,
    Plus,
    Search,
    Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

import { errorMessage, fieldErrors } from '@/api/baseApi';
import {
    useCreateTicketingClientMutation,
    useDeleteTicketingClientMutation,
    useGetTicketingClientsQuery,
    useSuspendTicketingClientMutation,
    useUnsuspendTicketingClientMutation,
    useUpdateTicketingClientMutation,
} from '@/api/endpoints/ticketing';
import type {
    ClientInput,
    Credentials,
    TicketingClient,
} from '@/api/ticketing-types';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ErrorState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { FilterBar } from '@/components/ui/filter-bar';
import { Input, Textarea } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Select } from '@/components/ui/select';
import { PageHeader } from '@/features/admin/org/shared';
import { usePermissions } from '@/hooks/usePermissions';
import { useRun } from '@/hooks/useRun';
import { formatDate } from '@/lib/date';

import { clientStatusOptions } from './constants';
import { ClientStatusBadge, SecretDialog } from './shared';
import { useUrlParams } from './useUrlParams';

export function TicketingClientsPage() {
    const { can } = usePermissions();
    const run = useRun();
    const navigate = useNavigate();
    const { params, set, reset } = useUrlParams();
    const search = params.get('search') ?? '';
    const status = params.get('status') ?? '';
    const page = Number(params.get('page') ?? 1);
    const [draft, setDraft] = useState(search);
    const { data, isLoading, isError, refetch } = useGetTicketingClientsQuery({
        search: search || undefined,
        status: status || undefined,
        page,
    });
    const [editing, setEditing] = useState<TicketingClient | 'new' | null>(
        null,
    );
    const [deleting, setDeleting] = useState<TicketingClient | null>(null);
    const [secret, setSecret] = useState<Credentials | null>(null);
    const [remove] = useDeleteTicketingClientMutation();
    const [suspend] = useSuspendTicketingClientMutation();
    const [unsuspend] = useUnsuspendTicketingClientMutation();

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

    const columns: Column<TicketingClient>[] = [
        {
            key: 'name',
            header: 'Client',
            primary: true,
            cell: (client) => (
                <div className="min-w-0">
                    <p className="truncate font-bold text-slate-900">
                        {client.name}
                    </p>
                    <p className="truncate text-xs font-normal text-slate-500">
                        {client.domain}
                    </p>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            cell: (client) => <ClientStatusBadge status={client.status} />,
        },
        {
            key: 'tickets',
            header: 'Tickets',
            cell: (client) => (
                <span className="text-xs">{client.tickets_count ?? 0}</span>
            ),
        },
        {
            key: 'rate',
            header: 'Rate limit',
            hideOnMobile: true,
            cell: (client) => (
                <span className="text-xs">{client.rate_limit_per_min}/min</span>
            ),
        },
        {
            key: 'created',
            header: 'Created',
            hideOnMobile: true,
            cell: (client) => (
                <span className="text-xs">{formatDate(client.created_at)}</span>
            ),
        },
        {
            key: 'actions',
            header: '',
            className: 'w-12',
            cell: (client) => (
                <div onClick={(event) => event.stopPropagation()}>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Actions for ${client.name}`}
                            >
                                <MoreHorizontal className="size-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem
                                onSelect={() =>
                                    navigate(
                                        `/admin/ticketing/clients/${client.id}`,
                                    )
                                }
                            >
                                <ExternalLink className="size-4" /> Open
                            </DropdownMenuItem>
                            {can('ticketing.clients.update') ? (
                                <DropdownMenuItem
                                    onSelect={() => setEditing(client)}
                                >
                                    <Pencil className="size-4" /> Edit
                                </DropdownMenuItem>
                            ) : null}
                            {can('ticketing.clients.suspend') &&
                            client.status === 'active' ? (
                                <DropdownMenuItem
                                    onSelect={() =>
                                        void run(
                                            suspend(client.id),
                                            `${client.name} suspended.`,
                                        )
                                    }
                                >
                                    <Pause className="size-4" /> Suspend
                                </DropdownMenuItem>
                            ) : null}
                            {can('ticketing.clients.suspend') &&
                            client.status === 'suspended' ? (
                                <DropdownMenuItem
                                    onSelect={() =>
                                        void run(
                                            unsuspend(client.id),
                                            `${client.name} is active again.`,
                                        )
                                    }
                                >
                                    <Play className="size-4" /> Unsuspend
                                </DropdownMenuItem>
                            ) : null}
                            {can('ticketing.clients.delete') ? (
                                <DropdownMenuItem
                                    destructive
                                    onSelect={() => setDeleting(client)}
                                >
                                    <Trash2 className="size-4" /> Delete
                                </DropdownMenuItem>
                            ) : null}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            ),
        },
    ];

    if (isError) {
        return (
            <ErrorState
                title="Could not load clients"
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

    const active = Number(Boolean(search)) + Number(Boolean(status));

    return (
        <div className="space-y-5">
            <PageHeader
                title="Ticketing clients"
                description={data ? `${data.meta.total} client(s)` : undefined}
                action={
                    can('ticketing.clients.create') ? (
                        <Button onClick={() => setEditing('new')}>
                            <Plus className="size-4" /> New client
                        </Button>
                    ) : null
                }
            />
            <FilterBar
                activeCount={active}
                onReset={() => {
                    setDraft('');
                    reset();
                }}
            >
                <Field label="Status" className="lg:w-44">
                    <Select
                        density="compact"
                        value={status || 'all'}
                        onValueChange={(value) =>
                            set({ status: value === 'all' ? null : value })
                        }
                        options={[
                            { value: 'all', label: 'All' },
                            ...clientStatusOptions,
                        ]}
                    />
                </Field>
                <Field label="Search" className="lg:ml-auto lg:w-72">
                    <div className="relative">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            density="compact"
                            className="pl-9"
                            placeholder="Name or domain"
                            value={draft}
                            onChange={(event) => setDraft(event.target.value)}
                        />
                    </div>
                </Field>
            </FilterBar>
            <DataTable
                columns={columns}
                rows={data?.items}
                rowKey={(client) => client.id}
                loading={isLoading}
                onRowClick={(client) =>
                    navigate(`/admin/ticketing/clients/${client.id}`)
                }
                emptyTitle={
                    active > 0
                        ? 'No client matches these filters'
                        : 'No clients yet'
                }
                emptyDescription={
                    active > 0
                        ? undefined
                        : 'Create a client to get the key and secret for its SDK.'
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

            <Drawer
                open={editing !== null}
                onOpenChange={(open) => !open && setEditing(null)}
            >
                <DrawerContent
                    title={editing === 'new' ? 'New client' : 'Edit client'}
                >
                    {editing ? (
                        <ClientForm
                            key={editing === 'new' ? 'new' : editing.id}
                            client={editing === 'new' ? null : editing}
                            onSaved={(credentials) => {
                                setEditing(null);
                                if (credentials) {
                                    setSecret(credentials);
                                }
                            }}
                        />
                    ) : null}
                </DrawerContent>
            </Drawer>

            <SecretDialog
                title="Client created"
                credentials={secret}
                onClose={() => setSecret(null)}
            />

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                destructive
                title="Delete client?"
                description={
                    deleting
                        ? `"${deleting.name}" loses access immediately and its keys stop working. Its tickets are kept for history.`
                        : ''
                }
                confirmLabel="Delete"
                onConfirm={async () => {
                    if (
                        deleting &&
                        (await run(remove(deleting.id), 'Client deleted.'))
                    ) {
                        setDeleting(null);
                    }
                }}
            />
        </div>
    );
}

const parseIps = (text: string): string[] | null => {
    const ips = text
        .split(/[\s,]+/)
        .map((ip) => ip.trim())
        .filter(Boolean);

    return ips.length > 0 ? ips : null;
};

/** Create and edit share one form; a create hands back the one-time credentials. */
export function ClientForm({
    client,
    onSaved,
}: {
    client: TicketingClient | null;
    onSaved: (credentials: Credentials | null) => void;
}) {
    const [create, createState] = useCreateTicketingClientMutation();
    const [update, updateState] = useUpdateTicketingClientMutation();
    const [values, setValues] = useState({
        name: client?.name ?? '',
        domain: client?.domain ?? '',
        ips: (client?.allowed_ips ?? []).join('\n'),
        rate: String(client?.rate_limit_per_min ?? 60),
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const text = (key: keyof typeof values) => ({
        value: values[key],
        onChange: (event: { target: { value: string } }) =>
            setValues((current) => ({ ...current, [key]: event.target.value })),
    });

    return (
        <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={async (event) => {
                event.preventDefault();

                const body: ClientInput = {
                    name: values.name.trim(),
                    domain: values.domain.trim().toLowerCase(),
                    allowed_ips: parseIps(values.ips),
                    rate_limit_per_min: values.rate
                        ? Number(values.rate)
                        : null,
                };

                try {
                    if (client) {
                        await update({ id: client.id, ...body }).unwrap();
                        toast.success('Client updated.');
                        onSaved(null);
                    } else {
                        const created = await create(body).unwrap();
                        // The secret lives in the dialog's state only: drop it from the cache.
                        createState.reset();
                        toast.success('Client created.');
                        onSaved(created.credentials);
                    }
                } catch (error) {
                    const fields = fieldErrors(error);
                    setErrors(fields);

                    if (Object.keys(fields).length === 0) {
                        toast.error(errorMessage(error));
                    }
                }
            }}
        >
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
                <Field label="Name" required error={errors.name}>
                    <Input {...text('name')} />
                </Field>
                <Field
                    label="Domain"
                    required
                    error={errors.domain}
                    hint="The client's website, e.g. acme.com. Email senders must be on this domain."
                >
                    <Input placeholder="acme.com" {...text('domain')} />
                </Field>
                <Field
                    label="Allowed IPs"
                    error={errors.allowed_ips ?? errors['allowed_ips.0']}
                    hint="Optional. One per line; only these servers may call the API. Leave empty to allow any."
                >
                    <Textarea rows={3} {...text('ips')} />
                </Field>
                <Field
                    label="Rate limit (requests per minute)"
                    error={errors.rate_limit_per_min}
                >
                    <Input type="number" min={1} {...text('rate')} />
                </Field>
            </div>
            <div className="flex gap-2 border-t border-slate-100 p-4">
                <Button
                    type="submit"
                    block
                    loading={createState.isLoading || updateState.isLoading}
                >
                    {client ? 'Save client' : 'Create client'}
                </Button>
            </div>
        </form>
    );
}

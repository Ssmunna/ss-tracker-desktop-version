import {
    Pause,
    Pencil,
    Play,
    RefreshCw,
    ShieldOff,
    Ticket,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import {
    useDeleteTicketingClientMutation,
    useGetTicketingClientQuery,
    useRegenerateTicketingKeysMutation,
    useRevokeTicketingKeysMutation,
    useSuspendTicketingClientMutation,
    useUnsuspendTicketingClientMutation,
} from '@/api/endpoints/ticketing';
import type {
    ApiKeyRow,
    Credentials,
    TicketingClient,
} from '@/api/ticketing-types';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { ErrorState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Breadcrumbs } from '@/components/ui/breadcrumb-trail';
import { usePermissions } from '@/hooks/usePermissions';
import { useRun } from '@/hooks/useRun';
import { formatDate, formatDateTime } from '@/lib/date';

import { AuditTable } from './AuditTable';
import { ClientForm } from './ClientsPage';
import { NotificationsTab, TemplatesTab } from './ClientSettingsTabs';
import { ClientWebhooksTab } from './ClientWebhooksTab';
import {
    ClientStatusBadge,
    CopyValue,
    KeyStatusBadge,
    SecretDialog,
} from './shared';
import { useUrlParams } from './useUrlParams';

export function TicketingClientDetailPage() {
    const id = Number(useParams().clientId);
    const navigate = useNavigate();
    const { can } = usePermissions();
    const run = useRun();
    const { params, set } = useUrlParams();
    const tab = params.get('tab') ?? 'overview';
    const {
        data: client,
        isLoading,
        isError,
        refetch,
    } = useGetTicketingClientQuery(id);
    const [editing, setEditing] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [suspend] = useSuspendTicketingClientMutation();
    const [unsuspend] = useUnsuspendTicketingClientMutation();
    const [remove] = useDeleteTicketingClientMutation();
    const [auditPage, setAuditPage] = useState(1);

    if (isError) {
        return (
            <ErrorState
                title="Could not load this client"
                description="It may have been deleted."
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

    if (isLoading || !client) {
        return <Skeleton className="h-96 rounded-2xl" />;
    }

    return (
        <div className="space-y-5">
            <div className="space-y-2">
                <Breadcrumbs
                    items={[
                        { label: 'Ticketing', to: '/admin/ticketing' },
                        { label: 'Clients', to: '/admin/ticketing/clients' },
                        { label: client.name },
                    ]}
                />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
                                {client.name}
                            </h1>
                            <ClientStatusBadge status={client.status} />
                        </div>
                        <p className="text-sm text-slate-500">
                            {client.domain}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline">
                            <Link
                                to={`/admin/ticketing/tickets?client_id=${client.id}`}
                            >
                                <Ticket className="size-4" /> Tickets
                                {client.tickets_count !== undefined
                                    ? ` (${client.tickets_count})`
                                    : ''}
                            </Link>
                        </Button>
                        {can('ticketing.clients.update') ? (
                            <Button
                                variant="outline"
                                onClick={() => setEditing(true)}
                            >
                                <Pencil className="size-4" /> Edit
                            </Button>
                        ) : null}
                        {can('ticketing.clients.suspend') &&
                        client.status === 'active' ? (
                            <Button
                                variant="outline"
                                onClick={() =>
                                    void run(
                                        suspend(client.id),
                                        'Client suspended.',
                                    )
                                }
                            >
                                <Pause className="size-4" /> Suspend
                            </Button>
                        ) : null}
                        {can('ticketing.clients.suspend') &&
                        client.status === 'suspended' ? (
                            <Button
                                variant="outline"
                                onClick={() =>
                                    void run(
                                        unsuspend(client.id),
                                        'Client is active again.',
                                    )
                                }
                            >
                                <Play className="size-4" /> Unsuspend
                            </Button>
                        ) : null}
                        {can('ticketing.clients.delete') ? (
                            <Button
                                variant="destructiveSoft"
                                onClick={() => setDeleting(true)}
                            >
                                <Trash2 className="size-4" /> Delete
                            </Button>
                        ) : null}
                    </div>
                </div>
                {client.status === 'suspended' ? (
                    <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
                        This client is suspended: every SDK request is refused
                        until it is unsuspended. Its keys and data are kept.
                    </p>
                ) : null}
                {client.status === 'revoked' ? (
                    <p className="rounded-xl bg-red-50 p-3 text-xs text-red-700">
                        All keys are revoked. Regenerate the keys to let this
                        client connect again.
                    </p>
                ) : null}
            </div>

            <Tabs
                value={tab}
                onValueChange={(value) =>
                    set({ tab: value === 'overview' ? null : value })
                }
            >
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="keys">Keys</TabsTrigger>
                    <TabsTrigger value="notifications">
                        Notifications
                    </TabsTrigger>
                    <TabsTrigger value="templates">Email templates</TabsTrigger>
                    {can('ticketing.webhooks.view') ? (
                        <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
                    ) : null}
                    {can('ticketing.audit.view') ? (
                        <TabsTrigger value="activity">Activity</TabsTrigger>
                    ) : null}
                </TabsList>
                <TabsContent value="overview">
                    <OverviewTab client={client} />
                </TabsContent>
                <TabsContent value="keys">
                    <KeysTab client={client} />
                </TabsContent>
                <TabsContent value="notifications">
                    <NotificationsTab clientId={client.id} />
                </TabsContent>
                <TabsContent value="templates">
                    <TemplatesTab clientId={client.id} />
                </TabsContent>
                {can('ticketing.webhooks.view') ? (
                    <TabsContent value="webhooks">
                        <ClientWebhooksTab clientId={client.id} />
                    </TabsContent>
                ) : null}
                {can('ticketing.audit.view') ? (
                    <TabsContent value="activity">
                        <AuditTable
                            filters={{ client_id: String(client.id) }}
                            page={auditPage}
                            onPage={setAuditPage}
                            showClient={false}
                        />
                    </TabsContent>
                ) : null}
            </Tabs>

            <Drawer open={editing} onOpenChange={setEditing}>
                <DrawerContent title="Edit client">
                    {editing ? (
                        <ClientForm
                            client={client}
                            onSaved={() => setEditing(false)}
                        />
                    ) : null}
                </DrawerContent>
            </Drawer>

            <ConfirmDialog
                open={deleting}
                onOpenChange={setDeleting}
                destructive
                title="Delete client?"
                description={`"${client.name}" loses access immediately and its keys stop working. Its tickets are kept for history.`}
                confirmLabel="Delete"
                onConfirm={async () => {
                    if (await run(remove(client.id), 'Client deleted.')) {
                        navigate('/admin/ticketing/clients', { replace: true });
                    }
                }}
            />
        </div>
    );
}

function Detail({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-0.5">
            <dt className="text-[11px] font-bold tracking-wide text-slate-500 uppercase">
                {label}
            </dt>
            <dd className="text-sm text-slate-900">{children}</dd>
        </div>
    );
}

function OverviewTab({ client }: { client: TicketingClient }) {
    const current = client.keys?.find((key) => key.status === 'active');

    return (
        <div className="grid gap-4 lg:grid-cols-2">
            <Card className="space-y-4">
                <CardTitle>Details</CardTitle>
                <dl className="grid gap-4 sm:grid-cols-2">
                    <Detail label="Domain">{client.domain}</Detail>
                    <Detail label="Rate limit">
                        {client.rate_limit_per_min} requests/min
                    </Detail>
                    <Detail label="Allowed IPs">
                        {client.allowed_ips && client.allowed_ips.length > 0
                            ? client.allowed_ips.join(', ')
                            : 'Any'}
                    </Detail>
                    <Detail label="Tickets">{client.tickets_count ?? 0}</Detail>
                    <Detail label="Created">
                        {formatDate(client.created_at)}
                    </Detail>
                    {client.suspended_at ? (
                        <Detail label="Suspended since">
                            {formatDateTime(client.suspended_at)}
                        </Detail>
                    ) : null}
                </dl>
            </Card>
            <Card className="space-y-3">
                <CardTitle>SDK connection</CardTitle>
                <p className="text-xs text-slate-600">
                    The client&apos;s developers put these in their Laravel{' '}
                    <code>.env</code>. The secret was shown once when the keys
                    were created; regenerate the keys if it was lost.
                </p>
                <pre className="overflow-x-auto rounded-xl bg-slate-900 p-3 text-[11px] leading-relaxed text-slate-100">
                    {`TICKET_SDK_CLIENT_KEY=${current?.client_key ?? '(no active key)'}
TICKET_SDK_CLIENT_SECRET=sk_live_…  (shown once)
TICKET_SDK_BASE_URL=https://<this app's API domain>`}
                </pre>
            </Card>
        </div>
    );
}

function KeysTab({ client }: { client: TicketingClient }) {
    const { can } = usePermissions();
    const run = useRun();
    const [regenerate, regenerateState] = useRegenerateTicketingKeysMutation();
    const [revoke] = useRevokeTicketingKeysMutation();
    const [confirm, setConfirm] = useState<'regenerate' | 'revoke' | null>(
        null,
    );
    const [secret, setSecret] = useState<Credentials | null>(null);
    const manage = can('ticketing.keys.manage');

    const columns: Column<ApiKeyRow>[] = [
        {
            key: 'key',
            header: 'Client key',
            primary: true,
            cell: (key) => <CopyValue value={key.client_key} />,
        },
        {
            key: 'status',
            header: 'Status',
            cell: (key) => <KeyStatusBadge status={key.status} />,
        },
        {
            key: 'expires',
            header: 'Valid until',
            cell: (key) => (
                <span className="text-xs">
                    {key.status === 'grace'
                        ? formatDateTime(key.expires_at)
                        : key.status === 'active'
                          ? 'Until replaced'
                          : '-'}
                </span>
            ),
        },
    ];

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="max-w-xl text-xs text-slate-600">
                    <b>Regenerate</b> issues a new key and secret; the old pair
                    keeps working for 24 hours so the client can deploy the new
                    one without downtime. <b>Revoke</b> disables every key
                    immediately.
                </p>
                {manage ? (
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setConfirm('regenerate')}
                        >
                            <RefreshCw className="size-4" /> Regenerate keys
                        </Button>
                        <Button
                            variant="destructiveSoft"
                            onClick={() => setConfirm('revoke')}
                        >
                            <ShieldOff className="size-4" /> Revoke all
                        </Button>
                    </div>
                ) : null}
            </div>
            <DataTable
                columns={columns}
                rows={client.keys}
                rowKey={(key) => key.client_key}
                emptyTitle="No keys"
            />

            <SecretDialog
                title="New keys"
                credentials={secret}
                note={
                    secret?.previous_keys_valid_until
                        ? `The previous keys keep working until ${formatDateTime(secret.previous_keys_valid_until)}.`
                        : undefined
                }
                onClose={() => setSecret(null)}
            />

            <ConfirmDialog
                open={confirm === 'regenerate'}
                onOpenChange={(open) => !open && setConfirm(null)}
                title="Regenerate keys?"
                description="A new key and secret are created. The current pair stops working after 24 hours."
                confirmLabel="Regenerate"
                loading={regenerateState.isLoading}
                onConfirm={async () => {
                    try {
                        const keys = await regenerate(client.id).unwrap();
                        // Keep the secret in this component only, not in the shared cache.
                        regenerateState.reset();
                        setSecret(keys);
                        setConfirm(null);
                    } catch {
                        // The error toast (or the password prompt) is shown by the API layer.
                        setConfirm(null);
                    }
                }}
            />
            <ConfirmDialog
                open={confirm === 'revoke'}
                onOpenChange={(open) => !open && setConfirm(null)}
                destructive
                title="Revoke all keys?"
                description="The client is cut off immediately and cannot connect until you regenerate its keys."
                confirmLabel="Revoke"
                onConfirm={async () => {
                    if (await run(revoke(client.id), 'All keys revoked.')) {
                        setConfirm(null);
                    }
                }}
            />
        </div>
    );
}

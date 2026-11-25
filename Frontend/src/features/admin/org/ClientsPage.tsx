import {
    Link2,
    Mail,
    MoreHorizontal,
    Pencil,
    Plus,
    Search,
    Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';

import { errorMessage, fieldErrors } from '@/api/baseApi';
import {
    useClientEmailResetLinkMutation,
    useClientResetLinkMutation,
    useDeleteClientMutation,
    useGetClientsQuery,
    useSaveClientMutation,
} from '@/api/endpoints/org';
import type { ClientRow } from '@/api/org-types';
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
import { usePermissions } from '@/hooks/usePermissions';
import { useRun } from '@/hooks/useRun';

import { ActiveBadge, InviteLinkDialog, PageHeader } from './shared';
import { ACTIVE_OPTIONS } from './options';

export function ClientsPage() {
    const { can } = usePermissions();
    const run = useRun();
    const [params, setParams] = useSearchParams();
    const search = params.get('search') ?? '';
    const status = params.get('status') ?? '';
    const page = Number(params.get('page') ?? 1);
    const [draft, setDraft] = useState(search);
    const { data, isLoading, isError, refetch } = useGetClientsQuery({
        search: search || undefined,
        status: status || undefined,
        page,
    });
    const [editing, setEditing] = useState<ClientRow | 'new' | null>(null);
    const [deleting, setDeleting] = useState<ClientRow | null>(null);
    const [link, setLink] = useState<string | null>(null);
    const [remove] = useDeleteClientMutation();
    const [resetLink] = useClientResetLinkMutation();
    const [emailLink] = useClientEmailResetLinkMutation();

    const set = (next: Record<string, string | null>) => {
        const copy = new URLSearchParams(params);

        for (const [key, value] of Object.entries(next)) {
            if (value) {
                copy.set(key, value);
            } else {
                copy.delete(key);
            }
        }

        if (!('page' in next)) {
            copy.delete('page');
        }

        setParams(copy, { replace: true });
    };

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

    const columns: Column<ClientRow>[] = [
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
                        {client.email}
                        {client.company_name ? ` · ${client.company_name}` : ''}
                    </p>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            cell: (client) => <ActiveBadge status={client.status} />,
        },
        {
            key: 'contact',
            header: 'Contact',
            hideOnMobile: true,
            cell: (client) => (
                <span className="text-xs">
                    {[client.phone, client.country]
                        .filter(Boolean)
                        .join(' · ') || '-'}
                </span>
            ),
        },
        {
            key: 'projects',
            header: 'Projects',
            cell: (client) => (
                <span className="text-xs">{client.projects_count}</span>
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
                            {can('clients.update') ? (
                                <DropdownMenuItem
                                    onSelect={() => setEditing(client)}
                                >
                                    <Pencil className="size-4" /> Edit
                                </DropdownMenuItem>
                            ) : null}
                            {can('clients.reset-password-link') ? (
                                <>
                                    <DropdownMenuItem
                                        onSelect={async () => {
                                            try {
                                                const result = await resetLink(
                                                    client.id,
                                                ).unwrap();
                                                setLink(result.invite_link);
                                            } catch (error) {
                                                toast.error(
                                                    errorMessage(error),
                                                );
                                            }
                                        }}
                                    >
                                        <Link2 className="size-4" /> Get
                                        password link
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onSelect={() =>
                                            void run(emailLink(client.id))
                                        }
                                    >
                                        <Mail className="size-4" /> Email
                                        password link
                                    </DropdownMenuItem>
                                </>
                            ) : null}
                            {can('clients.delete') ? (
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
                title="Clients"
                description={data ? `${data.meta.total} client(s)` : undefined}
                action={
                    can('clients.create') ? (
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
                    setParams(new URLSearchParams(), { replace: true });
                }}
            >
                <Field label="Status" className="lg:w-40">
                    <Select
                        density="compact"
                        value={status || 'all'}
                        onValueChange={(value) =>
                            set({ status: value === 'all' ? null : value })
                        }
                        options={[
                            { value: 'all', label: 'All' },
                            ...ACTIVE_OPTIONS,
                        ]}
                    />
                </Field>
                <Field label="Search" className="lg:ml-auto lg:w-72">
                    <div className="relative">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            density="compact"
                            className="pl-9"
                            placeholder="Name, email or company"
                            value={draft}
                            onChange={(event) => setDraft(event.target.value)}
                        />
                    </div>
                </Field>
            </FilterBar>
            <DataTable
                columns={columns}
                rows={data?.clients}
                rowKey={(client) => client.id}
                loading={isLoading}
                emptyTitle={
                    active > 0
                        ? 'No client matches these filters'
                        : 'No clients yet'
                }
            />
            {data ? (
                <Pagination
                    page={data.meta.current_page}
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
                            onDone={() => setEditing(null)}
                        />
                    ) : null}
                </DrawerContent>
            </Drawer>

            <InviteLinkDialog link={link} onClose={() => setLink(null)} />

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                destructive
                title="Delete client?"
                description={
                    deleting
                        ? `"${deleting.name}" and their login will be removed.`
                        : ''
                }
                confirmLabel="Delete"
                onConfirm={async () => {
                    if (deleting && (await run(remove(deleting.id)))) {
                        setDeleting(null);
                    }
                }}
            />
        </div>
    );
}

function ClientForm({
    client,
    onDone,
}: {
    client: ClientRow | null;
    onDone: () => void;
}) {
    const [save, { isLoading }] = useSaveClientMutation();
    const [values, setValues] = useState({
        name: client?.name ?? '',
        email: client?.email ?? '',
        phone: client?.phone ?? '',
        country: client?.country ?? '',
        address: client?.address ?? '',
        company_name: client?.company_name ?? '',
        status: client?.status ?? 'active',
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

                try {
                    const result = await save({
                        id: client?.id,
                        ...values,
                        status: values.status as 'active' | 'inactive',
                        phone: values.phone || null,
                        country: values.country || null,
                        address: values.address || null,
                        company_name: values.company_name || null,
                    }).unwrap();
                    toast.success(result.message);
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
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
                <Field label="Name" required error={errors.name}>
                    <Input {...text('name')} />
                </Field>
                <Field
                    label="Email"
                    required
                    error={errors.email}
                    hint={
                        client
                            ? undefined
                            : 'A password setup email is sent to this address.'
                    }
                >
                    <Input type="email" {...text('email')} />
                </Field>
                <Field label="Company" error={errors.company_name}>
                    <Input {...text('company_name')} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Phone" error={errors.phone}>
                        <Input type="tel" {...text('phone')} />
                    </Field>
                    <Field label="Country" error={errors.country}>
                        <Input {...text('country')} />
                    </Field>
                </div>
                <Field label="Address" error={errors.address}>
                    <Textarea rows={3} {...text('address')} />
                </Field>
                <Field
                    label="Status"
                    required
                    error={errors.status}
                    hint="Inactive clients are signed out and cannot log in."
                >
                    <Select
                        value={values.status}
                        onValueChange={(value) =>
                            setValues((current) => ({
                                ...current,
                                status: value as 'active' | 'inactive',
                            }))
                        }
                        options={ACTIVE_OPTIONS}
                    />
                </Field>
            </div>
            <div className="flex gap-2 border-t border-slate-100 p-4">
                <Button type="submit" block loading={isLoading}>
                    Save client
                </Button>
            </div>
        </form>
    );
}
